# 01 — Arxitektura

## 1. Umumiy ko'rinish

```
                    ┌──────────────────────────────────────────────┐
                    │            MIJOZ ILOVALARI                   │
                    ├──────────────┬──────────────┬────────────────┤
                    │  Web         │  Telegram    │  Admin Panel   │
                    │  Next.js 15  │  Mini App    │  Vite React    │
                    │  (SSR/SEO)   │  Vite React  │  + Ant Design  │
                    └──────┬───────┴──────┬───────┴───────┬────────┘
                           │              │               │
                    /api/v1/app/**   /api/v1/app/**   /api/v1/admin/**
                    /auth/web/**     /auth/telegram/**  /auth/admin/**
                           │              │               │
                    ┌──────┴──────────────┴───────────────┴────────┐
                    │           NestJS Backend (REST)              │
                    │  Guards: Auth -> Permissions -> Plan         │
                    │  Interceptors: Transform, Logging            │
                    ├──────────────────────────────────────────────┤
                    │  Domain modullari                            │
                    │  auth · influencer · social-account · stats  │
                    │  analytics · search · dashboard · category   │
                    │  favorite · comparison · import · sync       │
                    │  subscription · reference · file · admin     │
                    └───┬──────────────┬───────────────┬───────────┘
                        │              │               │
                ┌───────┴──────┐ ┌─────┴─────┐ ┌───────┴────────┐
                │  PostgreSQL  │ │   Redis   │ │  BullMQ workers│
                │  + pg_trgm   │ │  cache +  │ │  sync · import │
                │              │ │  OTP/quota│ │  image         │
                └──────────────┘ └───────────┘ └───────┬────────┘
                                                       │
                                          ┌────────────┴────────────┐
                                          │  Tashqi provayderlar    │
                                          │  YouTube Data API       │
                                          │  TGStat / Telemetr      │
                                          │  RapidAPI / Modash      │
                                          └─────────────────────────┘
```

---

## 2. Backend modul xaritasi

```
src/
  main.ts                     # bootstrap: prefix, guards, swagger, helmet, cors
  app.module.ts
  prisma/                     # PrismaService (Global)
  common/
    dto/query.dto.ts          # QueryRequestDto (filter/sort/pagination) — ADR-003
    dto/pageable.dto.ts       # PageableResponseDto
    query/query-builder.ts    # QueryRequestDto -> Prisma where/orderBy
    query/filterable.ts       # FILTERABLE_FIELDS registry (oq ro'yxat)
    decorators/               # @CurrentUser, @Public, @Audience
    interceptors/             # transform, logging
    filters/                  # http-exception
    redis/  bullmq/  mail/  telegram-bot/
    env.validation.ts
  swagger/
    swagger.setup.ts          # 3 ta definition — ADR-009
  api/
    auth/                     # jwt strategy, guards, admin/web/telegram controllers
      otp/                    # OtpService + kanallar (telegram|email|sms|console)
    admin/                    # admin foydalanuvchilari CRUD
    role/                     # rollar + permissionlar
    user/                     # biznes foydalanuvchilari (admin ko'radi)
    reference/                # country, city, language
    category/                 # ierarxik kategoriyalar
    influencer/               # admin CRUD + aggregate service
    social-account/           # influencer x platforma
    stats/                    # joriy statistika + snapshotlar
    analytics/                # ER/growth/tier hisoblash (pure funksiyalar)
    sync/                     # provayderlar + BullMQ sinxronizatsiya
      providers/              # youtube, telegram, instagram, tiktok
    import/                   # CSV/Excel import
    search/                   # public katalog qidiruvi — ADR-010
    dashboard/                # top/trending/new/growing + cache
    favorite/  comparison/  saved-search/
    subscription/             # plan, subscription, PlanGuard — ADR-008
    featured/                 # pullik joylashtirish
    file/  health/  cron/  settings/  banner/  page/
```

**Qat'iy qoida:** `search/` va `influencer/` — ikki alohida modul.
`influencer/` — admin uchun yozish (CRUD). `search/` — public uchun o'qish
(filter, sort, cache, plan masking). Ularni birlashtirish taqiqlanadi (ADR-010).

---

## 3. Auth arxitekturasi (ADR-004)

### 3.1 Uchta kirish oqimi

```
ADMIN (admin panel)
  POST /auth/admin/login {email, password}
    -> bcrypt.compare -> User(type=ADMIN, active=true)
    -> {accessToken(15m), refreshToken(30d)}

TELEGRAM MINI APP
  Frontend: window.Telegram.WebApp.initData  (raw query string)
  POST /auth/telegram/init {initData}
    -> validateInitData(initData, BOT_TOKEN)   // pastda
    -> auth_date < 5 daqiqa tekshiruvi
    -> User upsert (telegramId bo'yicha), type=BUSINESS
    -> {accessToken, refreshToken, user, needsPhone: boolean}

  Telefon kerak bo'lsa (needsPhone=true):
  Frontend: tg.requestContact() -> {phone_number, ...} + Telegram imzosi
  POST /auth/telegram/bind-phone {initData, contact}
    -> imzo tekshiriladi -> User.phone yoziladi, phoneVerified=true

WEB
  POST /auth/web/otp/request {phone}
    -> rate limit (Redis): 1 kod / 60s, 5 kod / soat
    -> 6 xonali kod, bcrypt hash bilan OtpCode jadvaliga (TTL 10 daqiqa)
    -> OtpChannel.send()   // default: Telegram bot
    -> telefon botga MA'LUM (User.telegramId bor):
         javob: {sent: true, channel: 'TELEGRAM', expiresIn: 600}
       telefon NOMA'LUM (birinchi kirish):
         javob: {sent: false, channel: 'TELEGRAM', expiresIn: 600,
                 botDeepLink: 'https://t.me/<bot>?start=otp_<otpCodeId>'}
         -> foydalanuvchi botni ochadi -> bot request_contact bilan kontakt so'raydi
         -> telefon mos kelsa: User upsert (phone+telegramId) va kod chatga yuboriladi
  POST /auth/web/otp/verify {phone, code}
    -> attempts < 5 -> hash solishtiriladi -> User upsert -> JWT
```

### 3.2 Telegram `initData` validatsiyasi (aniq algoritm)

```ts
// src/api/auth/telegram/validate-init-data.ts
import { createHmac } from 'crypto';

export function validateInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  // 1) barcha kalitlarni alifbo tartibida "key=value" ko'rinishida \n bilan birlashtirish
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // 2) secret = HMAC_SHA256(key="WebAppData", message=botToken)
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();

  // 3) HMAC_SHA256(key=secret, message=dataCheckString) === hash
  const computed = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (computed !== hash) throw new UnauthorizedException('INVALID_INIT_DATA');

  // 4) replay himoyasi
  const authDate = Number(params.get('auth_date')) * 1000;
  if (Date.now() - authDate > 5 * 60 * 1000) throw new UnauthorizedException('INIT_DATA_EXPIRED');

  return JSON.parse(params.get('user'));
}
```

> Diqqat: `secret` va `computed` tartibi ko'p implementatsiyalarda adashtiriladi.
> Yuqoridagi tartib — Telegram rasmiy hujjatidagi tartib. O'zgartirmang.

### 3.3 OTP kanal abstraksiyasi

```ts
export interface OtpChannel {
  readonly name: 'TELEGRAM' | 'EMAIL' | 'SMS' | 'CONSOLE';
  send(target: { phone?: string; email?: string; telegramId?: string },
       code: string): Promise<{ delivered: boolean; botDeepLink?: string }>;
}
```

`OtpService` `OTP_CHANNEL` env qiymatiga qarab registrydan kanal oladi.
Kanal yetkazib berolmasa (`delivered: false`) — `OTP_FALLBACK_CHANNEL` ga o'tadi.

**TelegramOtpChannel — telefon -> telegramId muammosi.** Bot faqat o'zi bilan suhbat
boshlagan foydalanuvchiga yoza oladi va uning telefonini bilmaydi. Kanal shunday ishlaydi:
1. `User.phone == target` yozuvdan `telegramId` qidiriladi
2. Topilsa — kod yuboriladi (`delivered: true`)
3. Topilmasa — `{delivered: false, botDeepLink: 't.me/<bot>?start=otp_<otpCodeId>'}`
   qaytadi (deep link payload sifatida `OtpCode.id` ishlatiladi)
4. Bot `/start otp_<id>` da `request_contact` tugmasi bilan kontakt so'raydi,
   telefonni `OtpCode.target` bilan solishtiradi; mos bo'lsa `User` upsert qilib
   (phone + telegramId) kodni chatga yuboradi; mos bo'lmasa tushunarli xabar beradi
5. Keyingi kirishlarda telefon allaqachon bog'langan — kod darhol keladi

**Xavfsizlik qoidalari (buzilmaydi):**
- Kod bazada **ochiq saqlanmaydi** — faqat bcrypt hash
- TTL 10 daqiqa, 5 marta noto'g'ri urinishdan keyin kod bekor qilinadi
- Bir telefonga 60 soniyada 1 marta, soatiga 5 marta (Redis counter)
- Javobda "bunday foydalanuvchi yo'q" deyilmaydi (user enumeration)
- Dev rejimda `OTP_CHANNEL=CONSOLE` va `OTP_MASTER_CODE` (faqat `NODE_ENV!=production`)

### 3.4 Guard zanjiri

```
AuthGuard('jwt')      -> req.user (id, type, roleId, planCode)
  PermissionsGuard    -> @Permissions(PERMISSIONS.X) — faqat admin route'larida
    PlanGuard         -> @RequirePlan(PLAN.PRO)  (FEATURE_GATING_ENABLED bo'lsa)
      Controller
        TransformInterceptor + PlanMaskInterceptor -> @MaskForPlan(...) maydonlarini yashiradi
```

### 3.5 Token siyosati
| Token | TTL | Saqlanishi |
|---|---|---|
| accessToken | 15 daqiqa | Web: memory + httpOnly cookie; MiniApp/Admin: memory + localStorage |
| refreshToken | 30 kun | DB (`RefreshToken` jadvali, hash), rotatsiya bilan |

Refresh rotatsiyasi: har `POST /auth/refresh` da eski token bekor qilinadi va yangisi
beriladi. Bekor qilingan token qayta ishlatilsa — o'sha foydalanuvchining **barcha**
tokenlari bekor qilinadi (token theft detection).

---

## 4. Ma'lumot oqimi: uchta kanal (ADR-005)

```
                      ┌─────────────────────────────────────┐
   1) API SYNC        │  BullMQ repeatable job (kunlik)     │
                      │  SyncService -> ProviderRegistry    │
                      │    -> YouTubeProvider               │
                      │    -> TelegramProvider (TGStat)     │
                      │    -> InstagramProvider (RapidAPI)  │
                      └────────────────┬────────────────────┘
                                       │
   2) QO'LDA          Admin panel      │
      PUT /admin/social-accounts/:id/stats ──┐
                                       │     │
   3) IMPORT          CSV/Excel        │     │
      POST /admin/imports  -> parse -> validate -> dry-run -> apply ──┐
                                       │     │                        │
                                       ▼     ▼                        ▼
                            ┌──────────────────────────────────────────┐
                            │  StatsService.applyStats(accountId, dto) │
                            │  1. manualLock tekshiruvi (API uchun)    │
                            │  2. SocialAccountStats upsert            │
                            │  3. SocialAccountSnapshot upsert (bugun) │
                            │  4. AnalyticsService.compute(ER, growth) │
                            │  5. InfluencerAggregateService.recalc()  │
                            │  6. Redis cache invalidatsiya            │
                            └──────────────────────────────────────────┘
```

**`applyStats` — yagona kirish nuqtasi.** Uchala kanal ham faqat shu metod orqali
yozadi. `prisma.socialAccountStats.update()` ni boshqa joyda chaqirish taqiqlanadi.

### manualLock qoidasi
```ts
if (source === 'API' && account.manualLock) {
  // qo'lda kiritilgan maydonlar tegilmaydi
  dto = omit(dto, account.manualFields);  // string[] — qaysi maydonlar qo'lda kiritilgan
}
```

---

## 5. Analytics formulalari

Barcha hisoblashlar `src/api/analytics/analytics.formulas.ts` da — **sof funksiyalar**,
Prisma'ga bog'liq emas, unit test bilan qoplanadi.

```ts
// Engagement Rate — platformaga qarab
// Instagram / TikTok / Facebook (followers asosida)
ER = (avgLikes + avgComments) / followers * 100

// YouTube (views asosida — followers ER YouTube uchun yaroqsiz)
ER = (avgLikes + avgComments) / avgViews * 100

// Telegram (kanal — like yo'q, views asosida)
ER = avgViews / subscribers * 100

// O'sish (snapshot'lar orasida)
growth30d = (followersToday - followers30DaysAgo) / followers30DaysAgo * 100

// Views/Followers nisbati — "o'lik auditoriya" detektori
viewRate = avgViews / followers * 100     // < 10% => shubhali

// Kontent chastotasi
postFrequency = postsLast30Days / 30      // kuniga o'rtacha post
```

### Influencer tier (followers bo'yicha)
| Tier | Followers |
|---|---|
| NANO | < 10 000 |
| MICRO | 10 000 – 50 000 |
| MID | 50 000 – 250 000 |
| MACRO | 250 000 – 1 000 000 |
| MEGA | > 1 000 000 |

### popularityScore (dashboard reytingi uchun)
```ts
// DIQQAT: min-max normalizatsiya ISHLATILMAYDI — u butun baza bo'ylab min/max'ni
// talab qiladi va bitta influencerni recalculate qilishni nodeterministik qiladi.
// Har bir komponent QAT'IY shkala bilan 0..1 ga keltiriladi:
followersScore = clamp(log10(max(totalFollowers, 1)) / 7, 0, 1)  // 10M follower = 1.0
erScore        = clamp(maxEngagementRate / 15, 0, 1)             // 15%+ ER = 1.0
growthScore    = clamp((growthRate30d + 10) / 40, 0, 1)          // -10%..+30% oralig'i

popularityScore = 0.40 * followersScore + 0.35 * erScore + 0.25 * growthScore
```
Koeffitsientlar VA shkala chegaralari `Setting` jadvalida saqlanadi — kodda
hardcode qilinmaydi. Shkala o'zgartirilsa `recalculateAll()` ishga tushiriladi.

### Trending
```
trendingScore = profileViews(oxirgi 7 kun) / max(profileViews(oldingi 7 kun), 1)
```
Har soatda cron bilan hisoblanadi va Redis'ga yoziladi (`trending:influencers`, TTL 1 soat).

---

## 6. Swagger uchta definition (ADR-009)

### Route prefikslari
| Prefiks | Kim uchun | Guard |
|---|---|---|
| `/api/v1/auth/admin/**` | Admin panel | public (login) |
| `/api/v1/auth/web/**` | Web | public |
| `/api/v1/auth/telegram/**` | Mini App | public |
| `/api/v1/auth/**` (refresh, logout, me) | Hammasi | JWT |
| `/api/v1/admin/**` | Admin panel | JWT + Permissions |
| `/api/v1/app/**` | Web + Mini App (umumiy) | JWT (ba'zilari public) |
| `/api/v1/public/**` | Auth'siz (SEO profil sahifasi) | yo'q |

### Implementatsiya

```ts
// src/swagger/swagger.setup.ts
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';

type Audience = { key: string; name: string; prefixes: string[] };

const AUDIENCES: Audience[] = [
  { key: 'admin',   name: '1. Admin API',    prefixes: ['/api/v1/admin', '/api/v1/auth/admin', '/api/v1/auth/'] },
  { key: 'web',     name: '2. Web API',      prefixes: ['/api/v1/app', '/api/v1/public', '/api/v1/auth/web', '/api/v1/auth/'] },
  { key: 'miniapp', name: '3. Mini App API', prefixes: ['/api/v1/app', '/api/v1/public', '/api/v1/auth/telegram', '/api/v1/auth/'] },
];

function scope(doc: OpenAPIObject, prefixes: string[]): OpenAPIObject {
  const paths = Object.fromEntries(
    Object.entries(doc.paths).filter(([p]) =>
      prefixes.some((prefix) => p.startsWith(prefix)) &&
      // boshqa audience'ning auth sub-route'lari kirmasin
      !['/api/v1/auth/admin', '/api/v1/auth/web', '/api/v1/auth/telegram']
        .filter((x) => !prefixes.includes(x))
        .some((x) => p.startsWith(x)),
    ),
  );
  return { ...doc, paths };
}

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Influencer Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const full = SwaggerModule.createDocument(app, config);

  for (const a of AUDIENCES) {
    const doc = scope(full, a.prefixes);
    // JSON manzili: /api/docs/<key>-json
    app.getHttpAdapter().get(`/api/docs/${a.key}-json`, (_req, res) => res.json(doc));
  }

  // Bitta UI + "Select a definition" dropdown
  SwaggerModule.setup('api/docs', app, scope(full, AUDIENCES[0].prefixes), {
    explorer: true,
    swaggerOptions: {
      urls: AUDIENCES.map((a) => ({ name: a.name, url: `/api/docs/${a.key}-json` })),
      persistAuthorization: true,
    },
  });
}
```

**Frontend tip generatsiyasi:**
```bash
# web repo
npx openapi-typescript http://localhost:3000/api/docs/web-json -o src/shared/api/schema.d.ts
# miniapp repo
npx openapi-typescript http://localhost:3000/api/docs/miniapp-json -o src/shared/api/schema.d.ts
# admin repo
npx openapi-typescript http://localhost:3000/api/docs/admin-json -o src/shared/api/schema.d.ts
```

---

## 7. Query / filter kontrakti (ADR-003)

```ts
// POST /api/v1/app/influencers/search
{
  "page": 1,
  "perPage": 20,
  "query": "food blogger",              // matnli qidiruv (ixtiyoriy)
  "filters": [
    { "field": "categoryId",        "op": "in",      "value": ["uuid1", "uuid2"] },
    { "field": "totalFollowers",    "op": "between", "value": [100000, 500000] },
    { "field": "maxEngagementRate", "op": "gte",     "value": 5 },
    { "field": "countryId",         "op": "eq",      "value": "uuid" },
    { "field": "platform",          "op": "in",      "value": ["INSTAGRAM"] },
    { "field": "isVerified",        "op": "eq",      "value": true }
  ],
  "sort": [{ "field": "popularityScore", "dir": "desc" }]
}
```

Javob:
```ts
{
  "items": [...],
  "totalItems": 143,
  "totalPages": 8,
  "currentPage": 1,
  "perPage": 20,
  "appliedFilters": [...]      // frontend chip'lari uchun
}
```

**Oq ro'yxat majburiy:**
```ts
// src/api/search/influencer.filterable.ts
export const INFLUENCER_FILTERABLE = {
  categoryId:        { ops: ['eq', 'in'],                   path: 'categories.categoryId' },
  countryId:         { ops: ['eq', 'in'],                   path: 'countryId' },
  cityId:            { ops: ['eq', 'in'],                   path: 'cityId' },
  languageId:        { ops: ['in'],                          path: 'languages.languageId' },
  platform:          { ops: ['in'],                          path: 'socialAccounts.platform' },
  totalFollowers:    { ops: ['gte','lte','between'],         path: 'totalFollowers' },
  maxEngagementRate: { ops: ['gte','lte','between'],         path: 'maxEngagementRate' },
  avgViews:          { ops: ['gte','lte','between'],         path: 'avgViews' },
  growthRate30d:     { ops: ['gte','lte'],                   path: 'growthRate30d' },
  tier:              { ops: ['in'],                          path: 'tier' },
  gender:            { ops: ['eq'],                          path: 'gender' },
  isVerified:        { ops: ['eq'],                          path: 'isVerified' },
  priceFrom:         { ops: ['gte','lte','between'],         path: 'prices.price' },
} as const;

export const INFLUENCER_SORTABLE = [
  'popularityScore', 'totalFollowers', 'maxEngagementRate',
  'avgViews', 'growthRate30d', 'createdAt',
] as const;
```
Ro'yxatda yo'q maydon so'ralsa — `400 INVALID_FILTER_FIELD`.

---

## 8. Kesh strategiyasi (Redis)

| Kalit | Nima | TTL | Invalidatsiya |
|---|---|---|---|
| `dashboard:{lang}` | Dashboard bloklari | 10 daqiqa | influencer o'zgarganda |
| `trending:influencers` | Trending ro'yxati | 1 soat | cron |
| `influencer:{id}:{lang}` | Public profil | 5 daqiqa | o'sha influencer o'zgarganda |
| `categories:tree:{lang}` | Kategoriya daraxti | 1 soat | kategoriya o'zgarganda |
| `otp:{phone}` / `otp:rl:{phone}` | OTP rate limit | 60s / 1 soat | — |
| `quota:{userId}:{date}` | Kunlik qidiruv kvotasi | kun oxirigacha | — |

Qidiruv natijalari **keshlanmaydi** (filter kombinatsiyalari cheksiz).

---

## 9. Xatolik formati (barcha ilovalar uchun yagona)

```json
{
  "statusCode": 400,
  "code": "INVALID_FILTER_FIELD",
  "message": "Field 'password' is not filterable",
  "details": { "field": "password" },
  "timestamp": "2026-08-28T10:00:00.000Z",
  "path": "/api/v1/app/influencers/search"
}
```

`code` — mashina o'qiydigan konstanta. Frontend `message` ga emas, `code` ga tayanadi.
Barcha kodlar `src/common/error-codes.ts` da ro'yxatlanadi va
`03-API-CONTRACT.md` §9 da hujjatlanadi.

---

## 10. Deploy

```
┌──────────────┐
│  Nginx / CF  │
└──┬────┬───┬──┘
   │    │   │
   │    │   └─> admin.<domain>       (statik, Vite build)
   │    └─────> t.<domain>           (statik, Vite build — Telegram Mini App URL)
   └──────────> <domain>             (Next.js, Node server)
                api.<domain>         (NestJS, Docker)
```

- **Telegram Mini App HTTPS majburiy** va domen BotFather'da `/setmenubutton` bilan bog'lanadi
- Backend: Docker + docker-compose (app, postgres, redis, worker)
- Worker alohida konteyner: `node dist/main --worker` (BullMQ processorlar)
- Migratsiya: deploy oldidan `prisma migrate deploy`
- Loglar: pino JSON -> stdout; xatoliklar Sentry'ga

## 11. Env o'zgaruvchilari (backend)

```env
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

DATABASE_URL=postgresql://user:pass@localhost:5432/influencer

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_MINIAPP_URL=https://t.example.uz

OTP_CHANNEL=TELEGRAM          # TELEGRAM | EMAIL | SMS | CONSOLE
OTP_FALLBACK_CHANNEL=EMAIL
OTP_TTL_SECONDS=600
OTP_MASTER_CODE=              # faqat dev

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

ESKIZ_EMAIL=                  # keyinroq
ESKIZ_PASSWORD=

YOUTUBE_API_KEY=
TGSTAT_TOKEN=
RAPIDAPI_KEY=

FEATURE_GATING_ENABLED=false
SYNC_ENABLED=true
SYNC_CRON=0 3 * * *

PAGE_SIZE=20
CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003
UPLOAD_DIR=./uploads
PUBLIC_URL=http://localhost:3000
```
