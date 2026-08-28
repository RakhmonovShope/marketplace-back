# ROADMAP — influencer-backend

> **AI agent uchun ishlash tartibi:**
> 1. Bir vaqtda **1 ta qadam** bajariladi (murakkab qadamda 1 tadan ortiq emas).
> 2. Qadam tugagach `- [ ]` -> `- [x]` qilinadi.
> 3. Har qadam oxirida `Tekshirish` buyrug'i ishga tushiriladi.
> 4. `DoD` (tugadi mezoni) bajarilmasa — keyingi qadamga o'tilmaydi.
> 5. Qadamda noaniqlik bo'lsa — `docs/00-CONTEXT-AND-DECISIONS.md` dagi ADR'ga qaraladi.

---

## FAZA 0 — Skelet (B-01 … B-07)

### - [ ] STEP-B-01 — Repo va NestJS skeleti
**Maqsad.** Bo'sh, lint/build o'tadigan NestJS loyihasi.
**Bajarish.**
1. `pnpm dlx @nestjs/cli new influencer-backend --package-manager pnpm --strict`
2. `tsconfig.json`: `baseUrl: "src"`, `esModuleInterop: true`, `experimentalDecorators`,
   `emitDecoratorMetadata`, `target: ES2021`, `strictNullChecks: false`
3. `.prettierrc`: `{ "singleQuote": true, "trailingComma": "all" }`
4. `.eslintrc.js`: `@typescript-eslint/recommended` + `prettier`
5. `.gitignore`: `node_modules, dist, .env, uploads, *.log`
6. Repo ildizida `CLAUDE.md` (README.md dagi namuna bo'yicha), `docs/` papkasi
**DoD.** `pnpm build` va `pnpm lint` xatosiz.
**Tekshirish.** `pnpm build && pnpm lint`

### - [ ] STEP-B-02 — Konfiguratsiya va env validatsiyasi
**Fayllar.** `src/common/env.validation.ts`, `.env.example`
**Bajarish.**
1. `@nestjs/config` + `joi` o'rnatish
2. `ConfigModule.forRoot({ isGlobal: true, validationSchema })`
3. `01-ARCHITECTURE.md` §11 dagi barcha o'zgaruvchilarni schema'ga kiritish
4. `.env.example` yaratish (barcha kalitlar, qiymatlarsiz)
**DoD.** Majburiy env yo'q bo'lsa ilova aniq xato bilan ishga tushmaydi.
**Tekshirish.** `DATABASE_URL` ni o'chirib `pnpm start:dev` — xato xabari chiqadi.

### - [ ] STEP-B-03 — Docker Compose + Prisma
**Fayllar.** `docker-compose.yml`, `prisma/schema.prisma`, `src/prisma/*`
**Bajarish.**
1. `docker-compose.yml`: postgres:16, redis:7 (volume bilan)
2. `pnpm add prisma @prisma/client` + `pnpm prisma init`
3. `PrismaService extends PrismaClient` + `onModuleInit`, `enableShutdownHooks`
4. `PrismaModule` — `@Global()`
**DoD.** `docker compose up -d` va `pnpm prisma db push` ishlaydi.
**Tekshirish.** `docker compose up -d && pnpm prisma db push`

### - [ ] STEP-B-04 — Bootstrap: prefix, pipe, filter, interceptor
**Fayllar.** `src/main.ts`, `src/common/interceptors/*`, `src/common/filters/*`, `src/common/error-codes.ts`
**Bajarish.**
1. `app.setGlobalPrefix('api/v1')`
2. `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`
3. `helmet()`, CORS — `CORS_ORIGINS` dan
4. `HttpExceptionFilter` — `03-API-CONTRACT.md` §9 formatida
5. `TransformInterceptor`, `LoggingInterceptor`
6. `error-codes.ts` — barcha `code` konstantalari
**DoD.** Mavjud bo'lmagan route `{statusCode:404, code:'NOT_FOUND', ...}` qaytaradi.
**Tekshirish.** `curl -i localhost:3000/api/v1/yoq`

### - [ ] STEP-B-05 — Swagger uchta definition (ADR-009)
**Fayllar.** `src/swagger/swagger.setup.ts`
**Bajarish.** `01-ARCHITECTURE.md` §6 dagi kodni implementatsiya qilish.
Test uchun uchta bo'sh kontroller: `/admin/ping`, `/app/ping`, `/auth/telegram/ping`.
**DoD.** `/api/docs` da dropdown ishlaydi, har bir definition faqat o'z path'larini ko'rsatadi.
**Tekshirish.** `curl localhost:3000/api/docs/admin-json | jq '.paths | keys'` — faqat `/admin` va `/auth` path'lari.

### - [ ] STEP-B-06 — Health check
**Fayllar.** `src/api/health/*`
**Bajarish.** `@nestjs/terminus`, `PrismaHealthIndicator`, Redis ping.
`GET /api/v1/health` -> `{status:'ok', db:'up', redis:'up'}`
**Tekshirish.** `curl localhost:3000/api/v1/health`

### - [ ] STEP-B-07 — Redis va BullMQ
**Fayllar.** `src/common/redis/*`, `src/common/queue/*`
**Bajarish.**
1. `ioredis` + `cache-manager` -> `CacheService` (get/set/del/delByPattern)
2. `@nestjs/bullmq` + `BullModule.forRoot`
3. Navbatlar: `sync`, `import`, `image`, `notification`
4. Bull Board (`/api/v1/admin/queues`) — faqat dev rejimda
**DoD.** Test job qo'shiladi va processor uni oladi.
**Tekshirish.** `pnpm start:dev` loglarida navbat ulanishi ko'rinadi.

---

## FAZA 1 — Auth va RBAC (B-08 … B-17)

### - [ ] STEP-B-08 — Prisma: User, Role, RefreshToken, OtpCode
**Manba.** `docs/02-DATA-MODEL.md` — 1 va 2-bo'laklar
**Bajarish.** Enumlar + 4 ta model, migratsiya `init_auth`.
**DoD.** `pnpm prisma migrate dev --name init_auth` muvaffaqiyatli.
**Tekshirish.** `pnpm prisma studio` — jadvallar ko'rinadi.

### - [ ] STEP-B-09 — PERMISSIONS enum va seed
**Fayllar.** `src/api/auth/auth.enum.ts`, `prisma/seed.ts`
**Bajarish.**
1. `03-API-CONTRACT.md` §5 dagi barcha permissionlar
2. Seed: 4 ta rol, super-admin (env'dan), 4 ta plan, davlatlar+shaharlar, tillar,
   kategoriyalar (`02-DATA-MODEL.md` oxiridagi ro'yxat), sozlamalar
3. Seed **idempotent** — `upsert` ishlatiladi, qayta ishga tushirsa dublikat bo'lmaydi
**DoD.** `pnpm seed` ikki marta ishlatilsa ham xato bermaydi.
**Tekshirish.** `pnpm seed && pnpm seed`

### - [ ] STEP-B-10 — JWT infratuzilmasi va guardlar
**Fayllar.** `src/api/auth/{jwt.strategy.ts, permissions.guard.ts, permissions.decorator.ts, current-user.decorator.ts, public.decorator.ts}`
**Bajarish.**
1. `JwtStrategy` — payload `{sub, type, roleId, planCode}`, `validate` da user active tekshiruvi
2. `PermissionsGuard` — `user.role.permissions` bilan solishtiradi; `SUPER_ADMIN` hammasiga ruxsat
3. `@CurrentUser()` param dekorator
4. `TokenService` — access/refresh generatsiya, refresh rotatsiyasi, theft detection
**DoD.** Permission yetishmasa `403 FORBIDDEN` qaytadi.
**Tekshirish.** Unit test: `PermissionsGuard` ruxsat bor/yo'q holatlar uchun.

### - [ ] STEP-B-11 — Admin auth (email + parol)
**Fayllar.** `src/api/auth/auth.admin.controller.ts`, `auth.service.ts`
**Endpointlar.** `POST /auth/admin/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
**Bajarish.**
1. bcrypt (rounds 12)
2. Xato parolda `401 INVALID_CREDENTIALS` — "user topilmadi" deyilmaydi
3. `type !== ADMIN` bo'lsa admin login rad etiladi
4. Muvaffaqiyatli kirishda `lastLoginAt` yangilanadi
5. `@nestjs/throttler`: 10 urinish / daqiqa / IP
**DoD.** Seed qilingan super-admin bilan kirish ishlaydi, token `/auth/me` da tekshiriladi.
**Tekshirish.** `curl -X POST localhost:3000/api/v1/auth/admin/login -d '{"email":"...","password":"..."}' -H 'Content-Type: application/json'`

### - [ ] STEP-B-12 — OTP infratuzilmasi
**Fayllar.** `src/api/auth/otp/{otp.service.ts, otp-channel.interface.ts, channels/*}`
**Bajarish.** `01-ARCHITECTURE.md` §3.3 bo'yicha:
1. `OtpChannel` interfeysi + `ConsoleOtpChannel` + `EmailOtpChannel`
2. `OtpService.issue(target, purpose)` — kod generatsiya, bcrypt hash, DB'ga yozish
3. `OtpService.verify(target, code, purpose)` — attempts, expiry, consumedAt
4. Redis rate limit: `otp:rl:{target}` (60s) va `otp:hr:{target}` (1 soat, 5 ta)
5. `OTP_MASTER_CODE` — faqat `NODE_ENV !== 'production'`
**DoD.** Kod DB'da ochiq ko'rinmaydi; 5 marta xato kiritishda kod bekor bo'ladi.
**Tekshirish.** Unit test: `otp.service.spec.ts` — expiry, attempts, rate limit.

### - [ ] STEP-B-13 — Telegram bot servisi va TelegramOtpChannel
**Fayllar.** `src/common/telegram/{telegram.service.ts, telegram.module.ts}`, `src/api/auth/otp/channels/telegram.channel.ts`
**Bajarish.**
1. `grammy` (yoki `telegraf`) o'rnatish, `TELEGRAM_BOT_TOKEN`
2. `TelegramService.sendMessage(chatId, text)`
3. Bot `/start` handleri: `telegramId` -> `User` upsert (telefon so'ralmaydi)
4. `/start` da `startapp` parametri bo'lsa (deep link) — Mini App tugmasi ko'rsatiladi
5. `TelegramOtpChannel`: foydalanuvchi `telegramId` bo'lsa bot orqali yuboradi;
   bo'lmasa `{delivered:false, botDeepLink:'https://t.me/<bot>?start=otp_<hash>'}` qaytaradi
6. `OTP_CHANNEL=TELEGRAM` default, yetkazilmasa `OTP_FALLBACK_CHANNEL` ga o'tadi
**DoD.** Bot'ga `/start` yozgan foydalanuvchi OTP so'rasa — kod Telegram'ga keladi.
**Tekshirish.** Qo'lda: real bot token bilan test.

### - [ ] STEP-B-14 — Web auth (telefon + OTP)
**Fayllar.** `src/api/auth/auth.web.controller.ts`
**Endpointlar.** `POST /auth/web/otp/request`, `POST /auth/web/otp/verify`
**Bajarish.**
1. Telefon normalizatsiyasi: `+998XXXXXXXXX` formatiga keltirish (`libphonenumber-js`)
2. `verify` muvaffaqiyatli bo'lsa `User` upsert (`type=BUSINESS`, `phoneVerified=true`,
   `registeredFrom=WEB`), FREE plan `Subscription` yaratiladi
3. Javobda `isNew: boolean` — frontend onboarding ko'rsatadi
**DoD.** Yangi telefon bilan to'liq oqim ishlaydi va foydalanuvchi yaratiladi.
**Tekshirish.** `OTP_CHANNEL=CONSOLE` bilan: request -> logdan kod -> verify -> token.

### - [ ] STEP-B-15 — Telegram Mini App auth (ADR-004)
**Fayllar.** `src/api/auth/telegram/{validate-init-data.ts, auth.telegram.controller.ts}`
**Endpointlar.** `POST /auth/telegram/init`, `POST /auth/telegram/bind-phone`
**Bajarish.**
1. `validate-init-data.ts` — `01-ARCHITECTURE.md` §3.2 dagi **aniq** algoritm
2. `init`: user upsert `telegramId` bo'yicha, `firstName/lastName/avatar` Telegram'dan,
   `registeredFrom=MINIAPP`, javobda `needsPhone = !user.phone`
3. `bind-phone`: `initData` qayta tekshiriladi, `contact.user_id === initData.user.id`
   bo'lishi shart (boshqa odamning kontaktini yuborishga yo'l qo'yilmaydi),
   telefon normalizatsiya qilinadi, `phoneVerified=true`
4. `contact` obyekti va `initData` user id mos kelmasa -> `403`
**DoD.** Noto'g'ri `hash` bilan `401 INVALID_INIT_DATA`; eski `auth_date` bilan `401 INIT_DATA_EXPIRED`.
**Tekshirish.** Unit test: to'g'ri va buzilgan initData uchun.

### - [ ] STEP-B-16 — Role va Admin CRUD
**Fayllar.** `src/api/role/*`, `src/api/admin/*`
**Endpointlar.** `03-API-CONTRACT.md` §4.1 standart CRUD + `GET /admin/roles/permissions`
**Bajarish.**
1. Rol CRUD; `isSystem=true` rollarni o'chirish taqiqlanadi
2. Admin CRUD (`type=ADMIN`): yaratishda parol generatsiya qilinadi va emailga yuboriladi
3. Admin o'zini o'chira olmaydi
4. `GET /admin/roles/permissions` — guruhlangan permission ro'yxati (UI checkbox daraxti uchun)
**DoD.** Yangi rol yaratib, unga admin biriktirilganda o'sha admin faqat ruxsat berilgan
endpointlarga kira oladi.
**Tekshirish.** `pnpm build` + Swagger'da `/admin/roles/**` ko'rinadi.

### - [ ] STEP-B-17 — User moduli (biznes foydalanuvchilari)
**Fayllar.** `src/api/user/*`
**Endpointlar.** `POST /admin/users/search`, `GET /admin/users/:id`, `POST /admin/users/:id/block`,
`POST /admin/users/:id/unblock`, `PUT /auth/me`
**Bajarish.**
1. Admin foydalanuvchilarni ko'radi: ro'yxat, filter (`registeredFrom`, `active`, sana)
2. Bloklash: `blockedAt`, `blockReason` -> bloklangan user JWT bilan ham `403 FORBIDDEN`
   (`JwtStrategy.validate` da tekshiriladi)
3. `GET /admin/users/:id` — profil + oxirgi faollik (favorites, searches soni)
**DoD.** Bloklangan foydalanuvchining mavjud tokeni ham ishlamaydi.
**Tekshirish.** Bloklab, eski token bilan `/auth/me` — `403`.

---

## FAZA 2 — Katalog asosi (B-18 … B-26)

### - [ ] STEP-B-18 — Query/filter kontrakti v2 (ADR-003) ⚠️ kritik
**Fayllar.** `src/common/dto/query.dto.ts`, `src/common/query/{query-builder.ts, filterable.ts}`
**Bajarish.**
1. `QueryRequestDto`: `page, perPage, query?, filters[], sort[]`
2. `FilterItemDto`: `{field: string, op: FilterOp, value: any}`;
   `FilterOp = eq|ne|gt|gte|lt|lte|in|nin|contains|between|isNull`
3. `buildWhere(filters, filterableMap)` — Prisma `where` quradi;
   nested path (`categories.categoryId`) uchun `some` generatsiya qiladi
4. `buildOrderBy(sort, sortableList)`
5. Oq ro'yxatda yo'q maydon -> `400 INVALID_FILTER_FIELD`;
   ruxsat etilmagan operatsiya -> `400 INVALID_FILTER_OPERATION`
6. `perPage` maksimum 100
**DoD.** Unit testlar barcha operatsiyalar va nested path uchun o'tadi.
**Tekshirish.** `pnpm test query-builder`

### - [ ] STEP-B-19 — Fayl va rasm moduli
**Fayllar.** `src/api/file/*`
**Bajarish.**
1. `marketplace-backend/src/api/file/` dan ko'chirish
2. Multer diskka: `uploads/files/<yyyy>/<mm>/<dd>/<uuid>.<ext>`
3. `sharp` bilan BullMQ orqali variantlar: `thumb 150`, `medium 600`, `large 1200` (webp)
4. `File` modeli (`02-DATA-MODEL.md` 9-bo'lak), `variants` JSON
5. `ServeStaticModule` yoki `GET /files/**` public route
6. Validatsiya: max 5MB, faqat `image/jpeg|png|webp`
**DoD.** Rasm yuklanadi, variantlar generatsiya bo'ladi, URL ochiladi.
**Tekshirish.** `curl -F file=@test.jpg localhost:3000/api/v1/admin/files/upload -H "Authorization: Bearer ..."`

### - [ ] STEP-B-20 — Ma'lumotnomalar (Country, City, Language)
**Fayllar.** `src/api/reference/*`
**Bajarish.** 3 ta modelga standart CRUD (`REFERENCE__*` permissionlari) +
public `GET /app/references` (bir so'rovda hammasi, 1 soat kesh).
**DoD.** Seed'dagi 5 davlat, 14 shahar, 4 til API'dan qaytadi.
**Tekshirish.** `curl localhost:3000/api/v1/app/references`

### - [ ] STEP-B-21 — Kategoriya moduli (ierarxik)
**Fayllar.** `src/api/category/*`
**Endpointlar.** Admin CRUD + `GET /app/categories` (daraxt) + `GET /app/categories/:slug`
**Bajarish.**
1. `parentId` bilan daraxt; `buildTree()` helper (bitta so'rov -> xotirada daraxt)
2. Slug avtomatik generatsiya (`slugify`), unikal tekshiruv
3. `position` bo'yicha tartiblash, drag&drop uchun `PUT /admin/categories/reorder`
4. O'chirishda: subkategoriyalari yoki influencerlari bo'lsa `409` (soft delete bilan ham)
5. Daraxt Redis'da keshlanadi (`categories:tree:{lang}`, 1 soat), o'zgarishda tozalanadi
**DoD.** Seed'dagi 15 kategoriya + subkategoriyalar daraxt ko'rinishida qaytadi.
**Tekshirish.** `curl localhost:3000/api/v1/app/categories | jq '.[0].children'`

### - [ ] STEP-B-22 — Influencer yadrosi (admin CRUD)
**Manba.** `02-DATA-MODEL.md` 4-bo'lak
**Fayllar.** `src/api/influencer/*`
**Bajarish.**
1. Migratsiya `add_influencer_core`
2. `InfluencerAdminController`: search/get/create/update/delete/restore
3. Slug avtomatik generatsiya (`fullName` dan, dublikatga `-2` qo'shiladi)
4. `POST /admin/influencers/:id/publish` — `DRAFT -> PUBLISHED`;
   publish uchun majburiy: `fullName`, `avatarUrl`, kamida 1 kategoriya, kamida 1 ijtimoiy tarmoq
5. `POST /admin/influencers/:id/verify`
6. `influencer.filterable.ts` — `01-ARCHITECTURE.md` §7 dagi oq ro'yxat
**DoD.** Admin influencer yaratadi, tahrirlaydi, nashr qiladi.
**Tekshirish.** Swagger'dan to'liq CRUD sinovi.

### - [ ] STEP-B-23 — Kategoriya va til biriktirish
**Endpointlar.** `POST /admin/influencers/:id/categories`, `POST /admin/influencers/:id/languages`
**Bajarish.**
1. `InfluencerCategory` — `isPrimary` faqat bittada `true` bo'lishi ta'minlanadi
2. Biriktirish transaction ichida: eski bog'lanishlar o'chiriladi, yangilari yoziladi
3. `Category.influencerCount` yangilanadi
**DoD.** Bir influencerga bir nechta kategoriya, faqat bitta `isPrimary`.
**Tekshirish.** Ikki marta `isPrimary: true` yuborilsa oxirgisi qoladi.

### - [ ] STEP-B-24 — Ijtimoiy tarmoq akkauntlari
**Manba.** `02-DATA-MODEL.md` 5-bo'lak
**Fayllar.** `src/api/social-account/*`
**Bajarish.**
1. Migratsiya `add_social_and_stats` (SocialAccount, Stats, Snapshot, Post, Demographics)
2. CRUD: `POST /admin/influencers/:id/accounts`, `PUT/DELETE /admin/social-accounts/:id`
3. URL validatsiyasi va `username` ajratib olish (platformaga qarab regexp)
4. Dublikat: `@@unique([influencerId, platform, username])` -> `409 DUPLICATE_SOCIAL_ACCOUNT`
5. `isPrimary` — influencer ichida bitta
6. `Influencer.socialCount` yangilanadi
**DoD.** Influencerga Instagram va Telegram akkauntlari qo'shiladi.
**Tekshirish.** Bir xil akkauntni ikki marta qo'shishga urinish -> `409`.

### - [ ] STEP-B-25 — Reklama narxlari
**Fayllar.** `src/api/influencer/price/*`
**Endpointlar.** `POST /admin/influencers/:id/prices` (bulk upsert), `DELETE /admin/prices/:id`
**Bajarish.** `InfluencerPrice` CRUD; `Influencer.minPrice` yangilanadi.
**DoD.** Narx qo'shilgach `minPrice` avtomatik hisoblanadi.
**Tekshirish.** Ikki narx qo'shib, `minPrice` kichigiga teng ekanini tekshirish.

### - [ ] STEP-B-26 — Aggregate hisoblash servisi (ADR-007) ⚠️ kritik
**Fayllar.** `src/api/influencer/influencer-aggregate.service.ts`
**Bajarish.**
```ts
async recalculate(influencerId: string): Promise<void>
// 1. barcha active SocialAccount + stats olinadi
// 2. totalFollowers  = sum(followers)
//    maxEngagementRate = max(engagementRate)
//    avgViews        = max(avgViews)   // eng katta platforma bo'yicha
//    growthRate30d   = weighted avg(growth30d, followers bo'yicha)
//    primaryPlatform = eng ko'p follower'li platforma
//    tier            = tierOf(totalFollowers)
//    socialCount     = accounts.length
//    minPrice        = min(prices.price)
//    statsUpdatedAt  = now()
// 3. popularityScore = Setting'dagi koeffitsientlar bilan (01-ARCHITECTURE.md §5)
// 4. bitta prisma.influencer.update()
// 5. Redis: influencer:{id}:*, dashboard:* tozalanadi
```
Ommaviy qayta hisoblash: `recalculateAll()` — cron va migratsiyadan keyin uchun.
**DoD.** Statistika o'zgargach aggregatlar to'g'ri yangilanadi.
**Tekshirish.** Unit test: 3 ta akkaunt bilan aggregatlar qiymati.

---

## FAZA 3 — Statistika va analytics (B-27 … B-30)

### - [ ] STEP-B-27 — StatsService.applyStats() (ADR-005/006) ⚠️ kritik
**Fayllar.** `src/api/stats/stats.service.ts`
**Bajarish.** Statistikaning **yagona kirish nuqtasi**:
```ts
async applyStats(accountId: string, dto: ApplyStatsDto, source: DATA_SOURCE) {
  return this.prisma.$transaction(async (tx) => {
    const account = await tx.socialAccount.findUniqueOrThrow(...);

    // 1) manualLock (ADR-005)
    if (source === 'API' && account.manualLock) {
      dto = omit(dto, account.manualFields);
      if (isEmpty(dto)) return { skipped: true };
    }

    // 2) hisoblanadigan maydonlar
    const computed = AnalyticsFormulas.compute(account.platform, dto, previousSnapshots);

    // 3) joriy holat
    await tx.socialAccountStats.upsert(...);

    // 4) snapshot (ADR-006) — kun aniqligida upsert
    await tx.socialAccountSnapshot.upsert({
      where: { accountId_capturedAt: { accountId, capturedAt: startOfDay(dto.measuredAt) } },
      ...
    });

    // 5) manual bo'lsa manualFields yangilanadi
    if (source === 'MANUAL' && dto.lockFields) { ... }

    return { updated: true, computed };
  }).then(async (r) => {
    await this.aggregate.recalculate(account.influencerId);   // ADR-007
    return r;
  });
}
```
**Endpoint.** `PUT /admin/social-accounts/:id/stats`
**DoD.** Qo'lda kiritilgan statistika -> snapshot yoziladi -> aggregat yangilanadi.
**Tekshirish.** Statistika kiritib, `SocialAccountSnapshot` da bugungi yozuv borligini tekshirish.

### - [ ] STEP-B-28 — Analytics formulalari
**Fayllar.** `src/api/analytics/analytics.formulas.ts` (+ `.spec.ts`)
**Bajarish.** `01-ARCHITECTURE.md` §5 dagi barcha formulalar **sof funksiya** sifatida:
`engagementRate(platform, stats)`, `viewRate`, `postFrequency`, `growth(current, past)`,
`tierOf(followers)`, `popularityScore(input, weights)`.
Nolga bo'lish himoyasi majburiy (`followers === 0` -> `0` qaytadi).
**DoD.** 100% unit test qoplamasi, barcha platformalar uchun.
**Tekshirish.** `pnpm test analytics.formulas`

### - [ ] STEP-B-29 — O'sish grafigi API
**Endpoint.** `GET /app/influencers/:id/accounts/:accountId/growth?period=30d|90d|1y`
**Bajarish.**
1. Snapshot'lardan nuqtalar: `[{date, followers, engagementRate, avgViews}]`
2. `1y` uchun oylik agregatsiya (har oyning oxirgi snapshot'i)
3. Nuqta yetishmasa — bo'sh massiv, xato emas
4. Javobda `summary: {startValue, endValue, changePercent, direction}`
**DoD.** Grafik uchun tayyor nuqtalar qaytadi.
**Tekshirish.** Bir necha snapshot qo'lda kiritib, `period=30d` natijasini ko'rish.

### - [ ] STEP-B-30 — Eng yaxshi postlar
**Fayllar.** `src/api/stats/post.service.ts`
**Endpointlar.** `GET /app/influencers/:id/accounts/:accountId/posts`,
`POST /admin/social-accounts/:id/posts` (qo'lda qo'shish)
**Bajarish.** `SocialPost` CRUD, `engagementRate` bo'yicha top 10.
**DoD.** Postlar ER bo'yicha tartiblangan holda qaytadi.

---

## FAZA 4 — Ma'lumot yig'ish: uchala kanal (B-31 … B-36)

### - [ ] STEP-B-31 — Provider abstraksiyasi
**Fayllar.** `src/api/sync/providers/{provider.interface.ts, provider.registry.ts}`
**Bajarish.**
```ts
export interface SocialDataProvider {
  readonly platform: PLATFORM;
  readonly name: string;
  isAvailable(): boolean;                       // API kaliti bormi
  fetch(account: SocialAccount): Promise<ProviderResult>;
}
export interface ProviderResult {
  followers: number; following?: number; postsCount?: number;
  avgLikes?: number; avgComments?: number; avgViews?: number;
  topPosts?: ProviderPost[];
  raw: unknown;                                  // SyncLog uchun
}
```
`ProviderRegistry` — platforma bo'yicha provayder qaytaradi; yo'q bo'lsa `null`.
Migratsiya `add_sync_and_import` (SyncLog, ImportJob).
**DoD.** Registry dan `INSTAGRAM` so'ralsa mos provayder qaytadi.

### - [ ] STEP-B-32 — YouTube provider (rasmiy API)
**Fayllar.** `src/api/sync/providers/youtube.provider.ts`
**Bajarish.**
1. YouTube Data API v3: `channels.list(part=statistics,snippet)` -> subscribers, viewCount, videoCount
2. `search.list` + `videos.list` -> oxirgi 10 video -> avgViews, avgLikes, avgComments
3. Kvota tejash: bitta kanal uchun 2 so'rov; xato bo'lsa `SYNC_PROVIDER_UNAVAILABLE`
4. `externalId` = channelId; URL'dan channelId ajratib olish (handle -> channelId)
**DoD.** Real kanal uchun statistika keladi.
**Tekshirish.** `POST /admin/social-accounts/:id/sync` bilan YouTube akkaunti.

### - [ ] STEP-B-33 — Telegram provider (TGStat)
**Fayllar.** `src/api/sync/providers/telegram.provider.ts`
**Bajarish.** TGStat API (`channels/stat`, `channels/avg-posts-reach`) ->
subscribers, avgViews, ER. Kalit yo'q bo'lsa `isAvailable()` -> `false`.
**DoD.** Kalit bo'lsa ishlaydi, bo'lmasa akkaunt `syncStatus=NEVER` bo'lib qoladi (xato emas).

### - [ ] STEP-B-34 — Instagram / TikTok provayder adapteri
**Fayllar.** `src/api/sync/providers/{instagram.provider.ts, tiktok.provider.ts}`
**Bajarish.**
1. `RAPIDAPI_KEY` orqali ishlaydigan adapter (endpoint va mapping konfiguratsiyada)
2. Kalit yo'q bo'lsa `isAvailable() === false` — tizim qo'lda kiritishga tayanadi
3. Javob mapping'i `provider.config.ts` da — provayder almashtirilsa faqat mapping o'zgaradi
**DoD.** Kalit yo'q holatda ham ilova xatosiz ishlaydi.
**Eslatma.** Scraping yozilmaydi (ADR / §5 huquqiy eslatma).

### - [ ] STEP-B-35 — Sinxronizatsiya navbati
**Fayllar.** `src/api/sync/{sync.service.ts, sync.processor.ts, sync.controller.ts}`
**Bajarish.**
1. `SYNC_CRON` bo'yicha repeatable job -> barcha `active` akkauntlarni navbatga qo'yadi
2. Processor: `ProviderRegistry` -> `fetch()` -> `StatsService.applyStats(source='API')`
3. `SyncLog` yoziladi: status, davomiylik, `changedFields`, `rawPayload`
4. Xatolikda: 3 marta exponential backoff, keyin `syncStatus=FAILED`, `syncError`
5. Rate limit: platformaga qarab (`limiter: {max, duration}`)
6. `POST /admin/social-accounts/:id/sync` — darhol navbatga
7. `GET /admin/sync/status` — umumiy holat
8. Cron: 30 kundan eski `SyncLog.rawPayload` tozalanadi
**DoD.** Sinxronizatsiya ishlaydi, `manualLock` hurmat qilinadi, loglar yoziladi.
**Tekshirish.** `manualLock=true` qilib sync ishga tushirish -> qiymat o'zgarmasligi.

### - [ ] STEP-B-36 — CSV / Excel import (ikki bosqichli)
**Fayllar.** `src/api/import/*`
**Bajarish.**
1. `xlsx` (yoki `exceljs`) + `papaparse`
2. `GET /admin/imports/template?type=` — ustunlar izohi bilan namuna fayl
3. `POST /admin/imports` -> fayl saqlanadi, `status=VALIDATING`, navbatga
4. Processor: qatorlarni parse + `class-validator` bilan validatsiya ->
   `preview` (birinchi 20 qator: `{row, action: 'create'|'update', data, warnings}`),
   `errors` (`{row, field, message}`), `status=VALIDATED`
5. `POST /admin/imports/:id/apply` -> `status=PROCESSING` -> qatorlar batch (100 tadan)
   yoziladi; statistika **faqat `StatsService.applyStats(source='IMPORT')`** orqali
6. Yakunda `status=COMPLETED | PARTIAL`, hisobot
7. Ustunlar:
   - `INFLUENCER`: `fullName, categorySlug, countryCode, city, gender, bioUz, bioRu, contactPhone, contactTelegram`
   - `SOCIAL_ACCOUNT`: `influencerSlug, platform, username, url`
   - `STATS`: `influencerSlug, platform, username, followers, avgLikes, avgComments, avgViews, postsCount, measuredAt`
**DoD.** 100 qatorli fayl yuklanadi, preview ko'rinadi, apply'dan keyin ma'lumot bazada.
**Tekshirish.** Xato ustunli fayl yuklab, `errors` to'ldirilishini va apply bloklanishini tekshirish.

---

## FAZA 5 — Public API (B-37 … B-43)

### - [ ] STEP-B-37 — Qidiruv moduli (ADR-010) ⚠️ kritik
**Fayllar.** `src/api/search/*`
**Endpointlar.** `POST /app/influencers/search`, `GET /app/influencers/filters`, `GET /app/influencers/suggest`
**Bajarish.**
1. Migratsiya: `pg_trgm` extension + GIN indekslar (`02-DATA-MODEL.md` oxiri)
2. `search`: `QueryRequestDto` -> `buildWhere(INFLUENCER_FILTERABLE)`;
   baza filtri doim `status=PUBLISHED, active=true, deletedAt=null`
3. `query` bo'lsa: `fullName ILIKE` + trigram similarity, natijalar `similarity` bo'yicha
4. `filters` endpointi: kategoriyalar, davlatlar, shaharlar, tillar + `MIN/MAX` aggregatlar
   (1 soat kesh)
5. `suggest`: 10 ta natija, faqat `id, slug, fullName, avatarUrl, totalFollowers`
6. Har bir natija `InfluencerCardDto` (`03-API-CONTRACT.md` §3.1)
7. `isFavorite` — auth bo'lsa bitta qo'shimcha so'rov bilan (N+1 emas)
8. `isFeatured` influencerlar birinchi 3 o'rinda (`FeaturedPlacement` aktiv bo'lsa)
**DoD.** `01-ARCHITECTURE.md` §7 dagi misol so'rov to'g'ri natija qaytaradi.
**Tekshirish.** `EXPLAIN ANALYZE` — indekslar ishlayotganini tekshirish (Seq Scan bo'lmasligi).

### - [ ] STEP-B-38 — Public influencer profili
**Endpointlar.** `GET /app/influencers/:slug`, `GET /public/influencers/:slug`
**Bajarish.**
1. To'liq profil (`03-API-CONTRACT.md` §3.4 formatida)
2. `/public/**` — auth'siz, cheklangan (aloqa ma'lumotlari va batafsil analytics yo'q) — SEO uchun
3. Redis kesh 5 daqiqa
4. `locked: []` maydoni doim javobda bo'ladi (hozir bo'sh — ADR-008)
**DoD.** Profil barcha ijtimoiy tarmoqlar va statistikalar bilan qaytadi.

### - [ ] STEP-B-39 — Dashboard moduli
**Endpoint.** `GET /app/dashboard`
**Bajarish.**
1. Bloklar: `recommended` (isFeatured), `topPopular` (popularityScore),
   `trending` (Redis trendingScore), `fastestGrowing` (growthRate30d),
   `newest` (createdAt), `byCategory` (isPopular kategoriyalar bo'yicha top-6)
2. `stats`: umumiy sonlar
3. `banners`: aktiv bannerlar
4. Barchasi **bitta** `Promise.all` bilan, natija 10 daqiqa keshlanadi
5. Cron (soatlik): `trendingScore` hisoblab Redis'ga yozadi
**DoD.** Bitta so'rov bilan butun dashboard keladi, ikkinchi so'rov keshdan.
**Tekshirish.** Ikkinchi so'rov javob vaqti sezilarli kichik.

### - [ ] STEP-B-40 — Favorites
**Fayllar.** `src/api/favorite/*` (+ migratsiya `add_user_actions`)
**Endpointlar.** `03-API-CONTRACT.md` §3.5
**Bajarish.** CRUD, `Influencer.favoriteCount` yangilanadi, dublikat -> idempotent (409 emas).
**DoD.** Qo'shish/o'chirish ishlaydi, ro'yxatda `InfluencerCardDto` qaytadi.

### - [ ] STEP-B-41 — Taqqoslash
**Fayllar.** `src/api/comparison/*`
**Endpointlar.** `03-API-CONTRACT.md` §3.6
**Bajarish.**
1. `POST /app/comparison/preview` — 2..4 influencer, saqlanmaydi
2. Javob `rows` formatida (`best` indeksi hisoblanadi — qaysi qiymat yaxshiroq)
3. Metrikalar: totalFollowers, maxEngagementRate, avgViews, growthRate30d, tier,
   socialCount, minPrice, postFrequency
4. Saqlangan taqqoslashlar CRUD
**DoD.** Ikkita influencer taqqoslanadi, `best` to'g'ri belgilanadi.

### - [ ] STEP-B-42 — Saqlangan qidiruvlar
**Fayllar.** `src/api/saved-search/*`
**Bajarish.** CRUD; `filters` JSON `QueryRequestDto` ko'rinishida saqlanadi va
qayta yuborilganda ishlaydi.
**DoD.** Saqlangan filterni qayta ishlatish mumkin.

### - [ ] STEP-B-43 — Ko'rish va qidiruv statistikasi
**Fayllar.** `src/api/analytics/tracking.service.ts`
**Bajarish.**
1. `POST /app/influencers/:id/view` — `ProfileView` yozadi (navbat orqali, javobni kutmaydi)
2. `SearchLog` — har bir qidiruvda navbatga qo'yiladi
3. `Influencer.viewCount` — soatlik cron bilan yangilanadi (har so'rovda emas)
4. Bir IP/user uchun 1 soatda bitta ko'rish hisoblanadi (Redis dedup)
**DoD.** Ko'rishlar yoziladi va javob tezligiga ta'sir qilmaydi.

---

## FAZA 6 — Monetizatsiya skeleti (B-44 … B-47)

### - [ ] STEP-B-44 — Plan va Subscription
**Manba.** `02-DATA-MODEL.md` 8-bo'lak (migratsiya `add_monetization`)
**Bajarish.** Modellar + seed (FREE/PRO/BUSINESS/ENTERPRISE limitlari) +
`GET /app/plans`, `GET /auth/me` javobiga `plan` qo'shish +
`POST /admin/plans/:id` (limitlarni tahrirlash).
Ro'yxatdan o'tishda avtomatik FREE obuna.
**DoD.** `/auth/me` foydalanuvchining plan limitlarini qaytaradi.

### - [ ] STEP-B-45 — PlanGuard va maydon maskirovkasi (ADR-008)
**Fayllar.** `src/api/subscription/{plan.guard.ts, require-plan.decorator.ts, mask-for-plan.decorator.ts, plan-mask.interceptor.ts}`
**Bajarish.**
1. `@RequirePlan(PLAN_CODE.PRO)` + `PlanGuard` -> `403 PLAN_REQUIRED` (`requiredPlan` bilan)
2. `@MaskForPlan({ fields: [...], minPlan: PRO })` + `PlanMaskInterceptor` —
   maydonlarni `null` qiladi va javobning `locked[]` massiviga nomini qo'shadi
3. **Ikkalasi ham `FEATURE_GATING_ENABLED=false` bo'lsa hech narsa qilmaydi**
4. Qo'llash joylari (hozir passiv): `contact`, `growth` endpointi, `comparison`, export
**DoD.** `FEATURE_GATING_ENABLED=true` bilan maydonlar yashiriladi, `false` bilan hammasi ochiq.
**Tekshirish.** Ikkala rejimda `GET /app/influencers/:slug` javobini solishtirish.

### - [ ] STEP-B-46 — Kvota hisoblagichi
**Fayllar.** `src/api/subscription/quota.service.ts`
**Bajarish.** Redis `quota:{userId}:{yyyy-mm-dd}:{action}` (INCR + kun oxirigacha TTL);
limit oshsa `429 QUOTA_EXCEEDED`. `FEATURE_GATING_ENABLED` bilan boshqariladi.
`GET /auth/me` javobiga `usage: {searchesToday, limit}` qo'shiladi.
**DoD.** Gating yoqilganda FREE user 21-qidiruvda `429` oladi.

### - [ ] STEP-B-47 — Featured placement
**Fayllar.** `src/api/featured/*`
**Bajarish.** CRUD + aktiv joylashtirishlarni qidiruv va dashboard'ga ulash
(`isFeatured` va `featuredUntil` cron bilan yangilanadi).
**DoD.** Featured influencer katalogda yuqorida chiqadi.

---

## FAZA 7 — Yakuniy (B-48 … B-52)

### - [ ] STEP-B-48 — Kontent modullari
**Bajarish.** `Banner`, `Page`, `Setting` — CRUD + public o'qish
(migratsiya `add_infrastructure`). `Setting` orqali popularityScore koeffitsientlari.
**DoD.** Admin sozlamani o'zgartirsa, keyingi recalculate'da ishlatiladi.

### - [ ] STEP-B-49 — Telegram ulashish
**Endpoint.** `GET /app/share/influencer/:slug`
**Bajarish.** `t.me/<bot>/app?startapp=inf_<slug>` deep link + `t.me/share/url` havolasi.
Bot `/start inf_<slug>` ni tushunadi va Mini App'ni to'g'ri sahifada ochadi.
**DoD.** Ulashilgan havola Mini App'da profilni ochadi.

### - [ ] STEP-B-50 — Admin dashboard
**Endpoint.** `GET /admin/dashboard` (`03-API-CONTRACT.md` §4.6)
**Bajarish.** Hisoblagichlar, sinxronizatsiya salomatligi, oxirgi importlar, foydalanuvchi grafigi.
**DoD.** Bitta so'rovda admin bosh sahifasi ma'lumotlari.

### - [ ] STEP-B-51 — Kuzatuv va xavfsizlik
**Bajarish.**
1. `nestjs-pino` — JSON loglar, `requestId`
2. Sentry (`SENTRY_DSN` bo'lsa)
3. `@nestjs/throttler` — `03-API-CONTRACT.md` §7 dagi limitlar
4. Barcha `/admin` endpointlarda permission borligini tekshiruvchi test
5. `helmet`, CORS oq ro'yxati, `X-Powered-By` o'chirilgan
**DoD.** Loglar strukturalangan, rate limit ishlaydi.

### - [ ] STEP-B-52 — Deploy
**Bajarish.**
1. Ko'p bosqichli `Dockerfile` (build + runtime)
2. `docker-compose.prod.yml`: app, worker (`WORKER_MODE=true`), postgres, redis, nginx
3. GitHub Actions: lint -> build -> test -> docker push
4. Deploy skripti: `prisma migrate deploy` -> restart
5. `README.md`: lokal ishga tushirish yo'riqnomasi
**DoD.** `docker compose -f docker-compose.prod.yml up` bilan to'liq stack ishga tushadi.

---

## Bajarilish tartibi bo'yicha eslatma

- **B-18, B-26, B-27, B-37** — kritik qadamlar. Ularni shoshilib bajarmang,
  qolgan hamma narsa shularga tayanadi.
- **B-17 dan keyin** admin panel (`A-01`) ishini boshlash mumkin.
- **B-30 dan keyin** Mini App (`M-01`) ishini boshlash mumkin.
- **B-43 dan keyin** Web (`W-01`) ishini boshlash mumkin.
