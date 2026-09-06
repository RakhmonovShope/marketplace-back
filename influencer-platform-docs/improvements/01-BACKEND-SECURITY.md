# 01 — Backend: xavfsizlik va aniq buglar (P0)

> Repo: `influencer-backend`. Har band: **Muammo → Yechim → Tekshirish**. Tartib — xavf bo'yicha.

---

## S1. `trust proxy` yo'q — throttler va IP statistikasi buziladi (KRITIK, prod)

> ✅ Bajarildi (2026-09-06, B2-01): `TRUST_PROXY` env (default `false`, prod compose `1`) → Express `trust proxy`; `ThrottlerModule.forRootAsync` + `@nest-lab/throttler-storage-redis` (mavjud `REDIS_CLIENT`), `THROTTLE_LIMIT/TTL_MS` env; search `@Throttle(60/min)`. Tekshirildi: Redis'da `{…:default}:hits`, TRUST_PROXY=1 da XFF IP'lar alohida bucket (61-so'rov 429, boshqa IP 201), false da XFF e'tiborsiz.

**Muammo.** `docker-compose.prod.yml`: nginx → `app:3000`, nginx `X-Forwarded-For` yuboradi, lekin Express
`trust proxy` o'rnatilmagan → `req.ip` har doim nginx konteyner IP'si. Oqibat:
- `ThrottlerModule` (120/min/IP) → **butun sayt** uchun bitta hisoblagich → 120 so'rovdan keyin hammaga 429;
- `TrackingService.trackView` dedup kaliti `viewdedup:<id>:<ip>` → barcha anonim ko'rishlar 1 soatda bittaga tushadi;
- `RefreshToken.ip`, `ProfileView.ip`, admin login throttle (10/min) — hammasi bitta IP.

**Yechim.** `main.ts`:
```ts
const trustProxy = config.get<string>('TRUST_PROXY', 'false'); // prod compose'da '1'
if (trustProxy !== 'false') {
  app.getHttpAdapter().getInstance().set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}
```
`env.validation.ts`: `TRUST_PROXY: Joi.string().default('false')`; `docker-compose.prod.yml` `app.environment.TRUST_PROXY: '1'`.
Proxy'siz muhitda `false` qoladi (aks holda mijoz `X-Forwarded-For` bilan limitni chetlab o'tadi).

**Tekshirish.** Prod'da `pino` logida `req.remoteAddress` real mijoz IP'si; 2 ta turli qurilmadan 121+ so'rov → 429 yo'q.

---

## S2. `requestContact` javobi imzosiz qabul qilinadi — telefon soxtalashtirish (KRITIK)

> ✅ Bajarildi (2026-09-06, B2-02): `validate-contact.ts` (+8 unit test) — `requestContactComplete().raw` (yoki parsed `{contact, auth_date, hash}`) initData bilan bir xil HMAC sxemada tekshiriladi (`webapp-hash.ts` umumiy, `timingSafeEqual`); imzo/muddat/tuzilma xato → 401 `INVALID_CONTACT_DATA`; miniapp `AuthGate` endi `raw` yuboradi, `api-schema.d.ts` qayta generatsiya. Smoke: soxta telefon 401, imzosiz obyekt 401, boshqa user 403, 6 daqiqa eski 401, to'g'ri imzo 201.

**Muammo.** `AuthService.telegramBindPhone`: `initData` tekshiriladi (to'g'ri), keyin `dto.contact` dan `user_id` va
`phone_number` olinadi; `user_id === initData.user.id` bo'lsa telefon `phoneVerified: true` bilan yoziladi.
`contact` obyektini mijoz o'zi yasashi mumkin (`{ user_id: <o'z id>, phone_number: '+998...' }`) — Telegram imzosi tekshirilmaydi.

**Yechim.** `@telegram-apps/sdk` `requestContact()` natijasi `{ contact, auth_date, hash }` — Telegram uni initData bilan
**bir xil sxemada** imzolaydi (secret = HMAC_SHA256("WebAppData", botToken); data-check-string = `auth_date=...\ncontact=<json>`).
1. Miniapp `useBindPhone` **xom** natijani yuboradi (hozir ham `result as Record` — `auth_date`/`hash` ichida bor).
2. Backend `validate-contact.ts`: `hash` ni tekshirish, `auth_date` < 5 daqiqa, `contact.user_id === tgUser.id`.
   Imzo bo'lmasa → 401 `INVALID_CONTACT_DATA` (yangi kod).
3. Eski klientlar uchun (SDK `contact` ni `responseUnsafe` sifatida bersa) — `contact` + `auth_date` + `hash` maydonlari majburiy.

**Tekshirish.** Unit: to'g'ri imzo → OK; o'zgartirilgan telefon → 401; unit fayl `validate-contact.spec.ts`.

---

## S3. Loglarda `Authorization` sarlavhasi (O'RTA)

> ✅ Bajarildi (2026-09-06, B2-03): pinoHttp `redact` (authorization/cookie/x-telegram-init-data/set-cookie), `req` serializer faqat id/method/url/ip/userAgent (ip = Express `req.ip`, TRUST_PROXY bilan real), `customProps.userId`, autoLogging ignore: health, `/files/`, `/api/docs`. Smoke: Bearer/Cookie logda yo'q, `userId` bor, XFF 9.9.9.9 → `ip`.

**Muammo.** `LoggerModule` → pino-http default `req` serializer `headers` ni to'liq yozadi (`authorization: Bearer ...`, `cookie`).
Loglar Loki/faylga ketsa — token sizadi.

**Yechim.** `app.module.ts` `pinoHttp`:
```ts
redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-telegram-init-data"]'], censor: '[redacted]' },
serializers: { req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.remoteAddress }) },
customProps: (req) => ({ userId: (req as { user?: { id?: string } }).user?.id }),
```
`autoLogging.ignore` ga `/files/` va `/api/docs` ham.

---

## S4. Swagger production'da ochiq (O'RTA)

> ✅ Bajarildi (2026-09-06, B2-06): `SWAGGER_ENABLED` (prod default false) + `SWAGGER_USER/PASSWORD` → `express-basic-auth` (`/api/docs`, `/api/docs-json`, `/api/docs-yaml`). Smoke: NODE_ENV=production → `/api/docs` va `/api/docs/miniapp-json` 404; dev + creds → 401/200.

`setupSwagger` har doim ishlaydi. `SWAGGER_ENABLED` (prod default `false`) + ochilsa `express-basic-auth`
(`SWAGGER_USER/PASS`) `/api/docs*` uchun. Frontend tip generatsiyasi staging'dan yoki CI artefaktidan (`07-DEVOPS` §4).

---

## S5. `xlsx` va `multer` — zaif versiyalar (O'RTA)

| Paket | Hozir | Muammo | Yechim |
|---|---|---|---|
| `xlsx` | `^0.18.5` (npm) | SheetJS npm nashrini to'xtatgan; 0.18.5 da CVE-2023-30533 (prototype pollution), CVE-2024-22363 (ReDoS) — admin yuklagan fayl orqali | `exceljs` (faol) yoki SheetJS CDN nashri `xlsx@https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz`; import faqat birinchi varaq, 10k qator limiti |
| `multer` | `1.4.5-lts.2` | 2025 DoS advisory'lari | `multer@2` (`@nestjs/platform-express` 10 bilan `pnpm.overrides`) |
| `dotenv` | `^17` | ConfigModule o'zi yuklaydi; `prisma/seed.ts` dagina kerak bo'lsa devDep | tekshirib devDep'ga |

Import upload'ida `limits.fileSize` (10MB) va mimetype/kengaytma tekshiruvi borligini `import.admin.controller.ts` da tasdiqlang.

---

## S6. `OptionalAuthGuard` — eskirgan token jimgina anonim (UX bug, O'RTA)

> ✅ Bajarildi (2026-09-06, B2-04): `handleRequest`: Authorization yo'q → null; bor lekin yaroqsiz/eskirgan → 401 `UNAUTHORIZED`; strategy xatosi (403) saqlanadi (+4 unit test). Smoke: search/profile/view eskirgan JWT → 401, token'siz → 201/404. Web `apiFetch`: SSR'da 401 + bearer → bir marta anonim takror (sahifa yiqilmaydi); klient/miniapp/admin refresh oqimi o'zgarishsiz.

**Muammo.** `handleRequest(_err, user) { return user || null }` — token bor, lekin muddati o'tgan bo'lsa ham `null`.
`search`, `profile`, `view`, `favorites` marker'lari anonim bo'lib qaytadi; web `apiFetch` va admin/miniapp `axios-auth-refresh`
faqat **401** da refresh qiladi → 15 daqiqadan keyin foydalanuvchi "chiqib ketgan" kabi (isFavorite=false), lekin hech kim buni bilmaydi.

**Yechim.**
```ts
handleRequest(err, user, info, ctx) {
  const hasToken = !!ctx.switchToHttp().getRequest().headers.authorization;
  if (!hasToken) return null;                 // mehmon — OK
  if (err || !user) throw new UnauthorizedException({ code: ERROR_CODES.UNAUTHORIZED, message: 'Token yaroqsiz' });
  return user;
}
```
Endi eskirgan token → 401 → mijoz refresh → takror. Web SSR'da `inf_at` cookie 15 daqiqa — `getAccessToken()` bo'sh bo'lsa token yuborilmaydi (anonim), muammo yo'q.

---

## S7. Prisma xatolari 500 bo'lib qaytadi (PAST-O'RTA)

> ✅ Bajarildi (2026-09-06, B2-06): `prisma-error.map.ts` (+spec) — P2002 → 409 `CONFLICT` (`details.target`), P2025 → 404, P2003/P2000 → 400; `ERROR_CODES.CONFLICT`/`SERVICE_UNAVAILABLE` konstantalari (16 literal almashtirildi); xato javobida `requestId`. Smoke: yo'q country/city DELETE → 404 "Yozuv topilmadi".

`HttpExceptionFilter` faqat `HttpException` ni map qiladi. `P2002` (unique: `Country.code`, `Language.code`, `Page.slug`,
`InfluencerPrice`), `P2025` (yozuv yo'q), `P2003` (FK) → "Internal server error". Filter'ga:
```ts
if (exception instanceof Prisma.PrismaClientKnownRequestError) { P2002 → 409 CONFLICT (details.target), P2025 → 404 NOT_FOUND, P2003 → 400 VALIDATION_ERROR }
```
`CONFLICT` kodi `error-codes.ts` ga (hozir `'CONFLICT'` matn sifatida 6 joyda ishlatilgan — konstantaga).

---

## S8. Refresh rotatsiyasi poygasi (PAST)

`TokenService.rotate`: `findUnique` → `issueTokens` → `update(revokedAt)`. Ikkita parallel `refresh` bir xil token bilan →
ikkalasi ham yangi juftlik oladi (theft detection ishlamaydi, chunki `revokedAt` hali yo'q).
Yechim: `updateMany({ where: { id, revokedAt: null }, data: { revokedAt: now } })` → `count === 0` bo'lsa **reuse** deb hisoblash
(shu bilan atomik). Web'da mutex bor, admin/miniapp'da `axios-auth-refresh` navbatlaydi — lekin server tomonida ham yopish kerak.

---

## S9. Kichik, tez

| Muammo | Fayl | Yechim |
|---|---|---|
| `JwtPayload.planCode` doim `'FREE'` (TODO B-44), `AuthUser.planCode` chalg'itadi | `token.service.ts`, `jwt.strategy.ts` | Payload'dan olib tashlash; plan faqat `SubscriptionService` orqali |
| Admin login lockout yo'q (throttle IP bo'yicha, S1 bilan global) | `auth.service.ts` | Redis `login:fail:<email>` 10 urinish → 15 min |
| `CacheService.onModuleDestroy` → `disconnect()` | `cache.service.ts` | `quit()` (navbatdagi buyruqlar tugasin) |
| `ServeStatic` cache header'siz, `Content-Security-Policy` yo'q | `app.module.ts` | `serveStaticOptions: { maxAge: '365d', immutable: true, setHeaders: nosniff }` (`02-PERF` §7) |
| Validatsiya `details` faqat top-level `property` (nested `items[0].categoryId` yo'qoladi) | `main.ts` exceptionFactory | `children` ni rekursiv tekislash (`field: 'items.0.categoryId'`) |
| Bot 2+ instansda ikki marta polling (Telegram 409) | `telegram.service.ts` | README qoidasi: bot faqat worker'da; `BOT_ENABLED` default `false` API'da (`07-DEVOPS` §6) |
| `SearchLog.filters` to'liq DTO — retention yo'q | `tracking.service.ts` | 180 kun; `ProfileView` 90 kun (`02-PERF` §6) |

---

## Qarorlar

- `TRUST_PROXY` env, prod compose'da `1`. (taklif)
- `INVALID_CONTACT_DATA` xato kodi qo'shiladi. (taklif)
