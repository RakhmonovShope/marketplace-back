# ROADMAP — marketplace-backend

> **AI agent uchun ishlash tartibi:**
> 1. Bir vaqtda **1 ta qadam** (murakkab qadamda 1 tadan ortiq emas).
> 2. Qadam tugagach `- [ ]` → `- [x]`, hujjat bandiga "✅ (sana)" yoziladi.
> 3. Har qadam oxirida `Tekshirish` buyrug'i ishga tushiriladi; `DoD` bajarilmasa keyingisiga o'tilmaydi.
> 4. Har qadamdan keyin `pnpm lint && pnpm build` (STEP-20 dan keyin `pnpm typecheck && pnpm test` ham).
> 5. Noaniqlik — tegishli `docs/0X-*.md` hujjatining "Qarorlar" bo'limiga qaraladi; yo'q bo'lsa foydalanuvchidan so'raladi.
> 6. Har qadam — alohida commit (conventional): `fix(auth): …`, `feat(product): …`, `chore(deps): …`.

Fazalar: **0** kritik (1 hafta) → **1** poydevor (2–3 hafta) → **2** data model (1–2 hafta) →
**3** marketplace yadrosi (5–6 hafta) → **4** masshtab (2–3 hafta) → **5** g'oyalar (doimiy).

---

## FAZA 0 — Kritik tuzatishlar (production'dan oldin)

### - [x] STEP-01 — Build chiqishini tuzatish (`dist/main.js`) ✅ 2026-09-05
**Manba.** `02-BUGS` B1. **Fayllar.** `tsconfig.build.json`, `src/types/multer-s3.d.ts`, `src/common/mail/mail.service.ts`
**Bajarish.** `include: ["src/**/*"]`, `exclude` ga `prisma`; `multer-s3.d.ts` ni `src/types/` ga; `resolveTemplatesDir` → faqat `join(__dirname, 'templates')`.
**DoD.** `dist/main.js` mavjud, `dist/src` yo'q, `dist/common/mail/templates/*.hbs` bor.
**Tekshirish.** `rm -rf dist && pnpm build && node -e "require('fs').accessSync('dist/main.js')" && ls dist/common/mail/templates`

### - [x] STEP-02 — Signup privilege escalation ✅ 2026-09-05
**Manba.** `01-SECURITY` S1, `03-DATA-MODEL` D7. **Fayllar.** `auth.dto.ts`, `auth.service.ts`, `prisma/schema.prisma` (`Role.code`), `prisma/seed.ts`
**Bajarish.** `SignUp` dan `roleId/subType/active` olib tashlash; `Role.code @unique` + migratsiya `role_code`; seed `upsert` (`SUPER_ADMIN`, `CUSTOMER`); `signUp` serverda `CUSTOMER` rolini qo'yadi.
**DoD.** `roleId` yuborilsa 400; yangi user `subType=CUSTOMER`, `roleId=CUSTOMER`.
**Tekshirish.** e2e `auth.e2e-spec.ts` → "signup ignores roleId" (STEP-21 dan oldin — qo'lda curl).

### - [x] STEP-03 — Parol hash'i javoblardan olib tashlanadi ✅ 2026-09-05
**Manba.** `01-SECURITY` S2, `04-API` §3. **Fayllar.** `admin.dto.ts`, `admin.service.ts`, `auth.service.ts`, `auth.controller.ts`, `transform.interceptor.ts`
**Bajarish.** `UserResponseDto.password` o'chirish; `toUserResponse()` mapper (yoki Prisma `omit` — Prisma 6 dan keyin); `signUp/getMe/admin/*` mapper orqali.
**DoD.** Hech qaysi javobda `password` yo'q.
**Tekshirish.** `curl /v1/auth/get-me -H "Authorization: Bearer …" | jq 'has("password")'` → `false`

### - [x] STEP-04 — Throttler va `trust proxy` ✅ 2026-09-05
**Manba.** `02-BUGS` B2, `01-SECURITY` S9. **Fayllar.** `app.module.ts`, `main.ts`, `auth.controller.ts`, `health.controller.ts`, `file.controller.ts`
**Bajarish.** Bitta `default` throttler (300/min, env), auth route'larida `@Throttle({default:{…}})`, `@SkipThrottle()` health/files; `trust proxy`.
**DoD.** Admin panel 1 daqiqada 50 so'rov yuborsa 429 yo'q; `signin` 6-urinishda 429.
**Tekshirish.** `for i in $(seq 1 6); do curl -s -o /dev/null -w "%{http_code}\n" -X POST /v1/auth/signin -d '{}' -H 'Content-Type: application/json'; done`

### - [x] STEP-05 — Env schema to'ldirish + graceful shutdown ✅ 2026-09-05
**Manba.** `02-BUGS` B3, B7. **Fayllar.** `env.validation.schema.ts`, `redis.module.ts`, `prisma.service.ts`, barcha `*.service.ts` (`PAGE_SIZE`)
**Bajarish.** `PAGE_SIZE`, `REDIS_PASSWORD`, `IMAGE_CONCURRENCY`, `APP_NAME`, `SWAGGER_*`, `BCRYPT_ROUNDS` Joi'ga; `redis.quit()`, `$disconnect()`.
**DoD.** `.env` da `PAGE_SIZE` bo'lmasa ham pageable ishlaydi (default 20).
**Tekshirish.** `PAGE_SIZE= pnpm start:dev` → pageable 200; `Ctrl+C` → "Redis connection closed" logi.

### - [x] STEP-06 — WebSocket auth ✅ 2026-09-05
**Manba.** `01-SECURITY` S3. **Fayllar.** `chat.gateway.ts`, `message.dto.ts` (`SendMessageDto`), `message.controller.ts`
**Bajarish.** Handshake JWT + sessiya tekshiruvi, `client.data.userId`, xonalar `user:<id>`, `senderId` payload'dan emas, `ValidationPipe`, `deleteMessage` faqat ikki xonaga.
**DoD.** Tokensiz ulanish uziladi; boshqa user xabarini olib bo'lmaydi.
**Tekshirish.** `node test/manual/ws.js` (kichik skript: tokensiz → `disconnect`; token bilan → `receiveMessage`).

### - [x] STEP-07 — Fayl upload xavfsizligi ✅ 2026-09-05
**Manba.** `01-SECURITY` S4, `07-FILES` §1. **Fayllar.** `file.controller.ts`, `file.service.ts`
**Bajarish.** `file-type` bilan magic-byte; SVG → rad yoki `attachment`; javob header'lari (`nosniff`, `CSP sandbox`, `Cache-Control immutable`).
**DoD.** `.svg` `<script>` bilan yuklansa 400 yoki `attachment`; `.png` nomli matn fayli 400.
**Tekshirish.** `curl -F file=@evil.svg /v1/files/upload` → 400; `curl -I /files/2026/6/30/<uuid>.webp | grep -i cache-control`

### - [x] STEP-08 — Swagger prod'da yopiq, login enumeration, bcrypt ✅ 2026-09-05
**Manba.** `01-SECURITY` S5, S6. **Fayllar.** `main.ts`, `auth.service.ts`
**Bajarish.** `SWAGGER_ENABLED` + basic auth; `signIn` bir xil 401 + dummy compare + `active` tekshiruvi; `BCRYPT_ROUNDS=12`; `JWT_SESSION_EXPIRATION=15m` (`.env.example`).
**DoD.** `NODE_ENV=production` da `/api` 404/401; noto'g'ri telefon va noto'g'ri parol bir xil javob.
**Tekshirish.** `NODE_ENV=production SWAGGER_ENABLED=false node dist/main` → `curl -I /api` → 404.

### - [x] STEP-09 — Tez tuzatishlar to'plami ✅ 2026-09-06
**Manba.** `02-BUGS` B4, B5, B6, B8, B9, B10, B12, B13, B14; `01-SECURITY` S9 (`getMe` guard, `auth.guard.ts` o'chirish, `ADMIN__CREATE`, `Role.delete` 409).
**DoD.** `getById` hamma joyda 404; `message` count filter bilan; `badges/stream`, `cron/example`, `console.log` yo'q; `AllExceptionsFilter` `errors[]` + `code`.
**Tekshirish.** `grep -rn "console\.log" src/ | wc -l` → 0; `curl /v1/banners/00000000-0000-0000-0000-000000000000` → 404.

### - [x] STEP-10 — Repo gigiyenasi ✅ 2026-09-06
**Manba.** `01-SECURITY` S8, `11-DEPS` §1. **Fayllar.** `.gitignore`, `prisma/seed.ts`, `package.json`
**Bajarish.** `git rm -r --cached uploads`; `uploads/` `.gitignore`ga; seed ma'lumotlari `SEED_ADMIN_*` env'dan; keraksiz paketlarni olib tashlash; `prisma`/`@types/*` devDeps'ga.
**DoD.** `git ls-files uploads` bo'sh; `pnpm build` yashil; `node_modules` hajmi kamaygan.
**Tekshirish.** `git ls-files uploads | wc -l` → 0; `pnpm ls aws-sdk chalk node-plop dotenv uuid mkdirp` → bo'sh.

---

## FAZA 1 — Poydevor (DevOps, kuzatuv, test, konvensiyalar)

### - [x] STEP-11 — `.env.example`, `README.md`, Node pin ✅ 2026-09-06
**Manba.** `10-DEVOPS` §1, §4; `12-DX` §3, §5. **DoD.** `cp .env.example .env` bilan dev ishga tushadi; `pnpm env:check` yashil.
**Tekshirish.** `pnpm env:check`

### - [x] STEP-12 — docker-compose (dev) + Dockerfile ✅ 2026-09-06
**Manba.** `10-DEVOPS` §2, §3. **DoD.** `docker compose up -d` → postgres/redis/minio/mailpit; `docker build -t mb .` → `docker run mb` `/health` 200.
**Tekshirish.** `docker compose up -d && docker build -t mb . && docker run --rm --env-file .env --network host mb & sleep 5; curl localhost:3000/health`

### - [x] STEP-13 — pino + request id + Sentry ✅ 2026-09-06
**Manba.** `08-OBS` §1, §2. **DoD.** Har log qatorida `reqId`; javob header'ida `X-Request-Id`; 500 xato Sentry'da (DSN bo'lsa).
**Tekshirish.** `curl -i /v1/yoq | grep -i x-request-id`; log JSON.

### - [ ] STEP-14 — Health: live/ready (redis, disk, memory, queue)
**Manba.** `08-OBS` §4. **DoD.** Redis to'xtatilsa `/health/ready` 503, `/health/live` 200.
**Tekshirish.** `docker compose stop redis && curl -s -o /dev/null -w "%{http_code}" localhost:3000/health/ready` → 503

### - [ ] STEP-15 — Prometheus metrikalar
**Manba.** `08-OBS` §3. **DoD.** `/metrics` da `http_request_duration_seconds`, `bullmq_queue_waiting`.
**Tekshirish.** `curl localhost:3000/metrics | grep http_request_duration_seconds_bucket | head -1`

### - [ ] STEP-16 — Jest konfiguratsiyasi + birinchi unit testlar (auth, guard, filter)
**Manba.** `09-TESTING` §1, §2 (1–7). **DoD.** `pnpm test` ≥ 15 test yashil; `moduleDirectories` bilan `common/*` import ishlaydi.
**Tekshirish.** `pnpm test`

### - [ ] STEP-17 — e2e bazasi (Testcontainers yoki compose) + auth oqimi
**Manba.** `09-TESTING` §3 (1–3). **DoD.** `pnpm test:e2e` signup→verify→signin→refresh→logout o'tadi; `roleId` 400; `password` yo'q.
**Tekshirish.** `pnpm test:e2e`

### - [ ] STEP-18 — GitHub Actions CI
**Manba.** `10-DEVOPS` §6. **DoD.** PR'da lint/typecheck/test/build/e2e yashil; `master` da image push.
**Tekshirish.** PR ochib Actions'ni ko'rish.

### - [ ] STEP-19 — Pageable v2 (whitelist, operatorlar, sort, search)
**Manba.** `04-API` §2. **Fayllar.** `src/common/query/{query.dto.ts,query.builder.ts,query.spec.ts}`, har modulda `*.query.ts`
**Bajarish.** `QueryRequestDto` (legacy `filter`/`order` bilan mos), `buildPrismaQuery`, har servis o'z spec'i bilan; `helpers/getWhereOperations.ts` o'chiriladi.
**DoD.** `filter: [{field:'password',…}]` → 400 `FILTER_FIELD_NOT_ALLOWED`; `sort: [{field:'nameUz',dir:'ASC'}]` ishlaydi; unit test 100% builder.
**Tekshirish.** `pnpm test -- query` + `curl -X POST /v1/category/pageable -d '{"page":1,"filter":[{"field":"password","op":"eq","value":"x"}]}'` → 400

### - [ ] STEP-20 — Xato kodlari, serializer, `PATCH`, Swagger sifat, OpenAPI export (+ B15: sxema nomlari prefiks bilan)
**Manba.** `04-API` §3, §4, §6, §8; `12-DX` §6. **DoD.** Xato javobida `code`; `openapi/admin.json` CI artefakti; GET'larda `@ApiBody` yo'q.
**Tekshirish.** `pnpm api:export && jq '.paths | keys | length' openapi/admin.json`

### - [ ] STEP-21 — Soft-delete Prisma extension
**Manba.** `06-PERF` §5, `03-DATA` D12. **DoD.** Servislarda qo'lda `deletedAt: null` qolmagan; `withDeleted` admin ro'yxatida ishlaydi.
**Tekshirish.** `grep -rn "deletedAt: null" src/api | wc -l` → 0 (extension'dan tashqari)

### - [ ] STEP-22 — Generator tuzatish + `AGENTS.md`/`.cursor/rules` yangilash
**Manba.** `12-DX` §1, §4. **DoD.** `pnpm generate` yangi model uchun `category` bilan bir xil sifatli 6 fayl yaratadi, migratsiya qilmaydi; `AGENTS.md` eskirgan bandlarsiz.
**Tekshirish.** Vaqtinchalik `model Demo {…}` qo'shib `pnpm generate` → `pnpm build` yashil → o'chirish.

### - [ ] STEP-23 — Husky + lint-staged + commitlint + ESLint 9
**Manba.** `09-TESTING` §7, `11-DEPS` §5. **DoD.** Noto'g'ri commit xabari rad etiladi; pre-commit lint.
**Tekshirish.** `git commit -m "bad"` → rad.

---

## FAZA 2 — Ma'lumotlar modeli

### - [ ] STEP-24 — M1 `cleanup_demo_models` (TestModal, Car, dublikat indekslar)
**Manba.** `03-DATA` D14. **DoD.** `src/api/car` yo'q, `PERMISSIONS.CAR__*` yo'q, migratsiya o'tdi.
**Tekshirish.** `pnpm prisma migrate dev --name cleanup_demo_models && pnpm build`

### - [ ] STEP-25 — M3 Category daraxti + unique slug + indekslar
**Manba.** `03-DATA` D3. **DoD.** Self-relation; sikl → 400; dublikat slug → 409; `GET /v1/admin/categories/tree`.
**Tekshirish.** e2e `category.e2e-spec.ts`

### - [ ] STEP-26 — M4 pul `Float → Decimal` (expand/contract)
**Manba.** `03-DATA` D2, `10-DEVOPS` §5. **DoD.** `Product.price` `numeric(14,2)`; API'da `number`.
**Tekshirish.** `pnpm prisma migrate dev --name money_decimal`; `SELECT data_type FROM information_schema.columns WHERE table_name='Product' AND column_name='price'`

### - [ ] STEP-27 — M5 Order/OrderItem/StatusHistory
**Manba.** `03-DATA` D1. **DoD.** `Product.orderId` yo'q; jadvallar bor; seed'siz.
**Tekshirish.** `pnpm prisma migrate dev --name order_items && pnpm prisma validate`

### - [ ] STEP-28 — M6 Product katalog maydonlari, Variant, ProductBadge, pg_trgm
**Manba.** `03-DATA` D4. **DoD.** Migratsiya SQL'ida `CREATE EXTENSION pg_trgm` + GIN indeks.
**Tekshirish.** `psql -c "\di+ product_name_trgm"`

### - [ ] STEP-29 — M7 qolgan modellar (Store owner, User, Comment, Promo, Content, audit maydonlari)
**Manba.** `03-DATA` D5–D11, D13. **DoD.** `prisma validate`, barcha mavjud e2e yashil.
**Tekshirish.** `pnpm test:e2e`

---

## FAZA 3 — Marketplace yadrosi

### - [ ] STEP-30 — Product + Attribute admin modullari
**Manba.** `05-CORE` §1. **DoD.** CRUD + pageable v2 + bulk; slug generatsiya; e2e.
**Tekshirish.** `pnpm test:e2e -- product`

### - [ ] STEP-31 — Route prefikslari `admin/app` + Swagger uchta definition
**Manba.** `04-API` §1. **DoD.** Barcha mavjud controller'lar `/v1/admin/**`; `/api` dropdown; frontend URL'lari yangilangan (kelishilgan).
**Tekshirish.** `curl localhost:3000/api-json/admin | jq '.paths | keys'`

### - [ ] STEP-32 — i18n middleware + `lang` bo'yicha `name`
**Manba.** `04-API` §5. **DoD.** `Accept-Language: ru` → `name === nameRu` public javoblarda.
**Tekshirish.** `curl -H "Accept-Language: ru" /v1/app/categories/tree | jq '.[0].name'`

### - [ ] STEP-33 — Cache servisi (remember/invalidateByTag) + public katalog
**Manba.** `06-PERF` §3, `05-CORE` §3. **DoD.** `/v1/app/home`, `categories/tree`, `products/search`, `products/:slug`, `suggest`; ikkinchi so'rov cache'dan (log'da `cache=hit`).
**Tekshirish.** k6 `catalog.js` p95 < 150 ms (lokal).

### - [ ] STEP-34 — Mijoz auth: OTP (Eskiz/console) + Telegram
**Manba.** `05-CORE` §2. **DoD.** `otp/request` → `otp/verify` → tokenlar; 5 xato urinish → 429; Telegram `initData` → tokenlar.
**Tekshirish.** e2e `customer-auth.e2e-spec.ts` (console channel).

### - [ ] STEP-35 — Cart + PricingService
**Manba.** `05-CORE` §4. **DoD.** Mehmon savati → login'da merge; `warnings` (`OUT_OF_STOCK`, `PRICE_CHANGED`); promokod qo'llanadi.
**Tekshirish.** e2e `cart.e2e-spec.ts`

### - [ ] STEP-36 — Checkout + Order + status mashinasi + Idempotency-Key
**Manba.** `05-CORE` §5, `04-API` §6. **DoD.** Parallel 2 ta bir xil `Idempotency-Key` → bitta buyurtma; stok kamayadi; `INVALID_TRANSITION` 409; bekor → stok qaytadi.
**Tekshirish.** e2e `order.e2e-spec.ts` (parallel so'rov testi bilan)

### - [ ] STEP-37 — Sessiya cache (JwtStrategy → Redis)
**Manba.** `06-PERF` §1. **DoD.** Himoyalangan so'rovda DB query 0 (cache hit); logout'dan keyin darhol 401.
**Tekshirish.** pino log `dbQueries: 0`; `logout` → `get-me` 401.

### - [ ] STEP-38 — Payment: `PaymentProvider` + Payme + Click + COD
**Manba.** `05-CORE` §6. **DoD.** Sandbox'da to'lov → `order.paymentStatus=PAID`, `status=CONFIRMED`; takror webhook → o'zgarish yo'q; summa mos kelmasa rad.
**Tekshirish.** Provayder sandbox + e2e webhook imzo testi.

### - [ ] STEP-39 — Notifications (Telegram/SMS/email/in-app)
**Manba.** `05-CORE` §9. **DoD.** `order.created` → Telegram xabar (bot) va in-app yozuv; xato → retry (BullMQ).
**Tekshirish.** Test bot bilan buyurtma yaratish.

### - [ ] STEP-40 — Reviews + moderatsiya + rating denormalizatsiya
**Manba.** `05-CORE` §7. **DoD.** Faqat DELIVERED buyurtmali user; approve → `ratingAvg` yangilanadi.
**Tekshirish.** e2e `review.e2e-spec.ts`

### - [ ] STEP-41 — Promo engine (Promotion + Promocode + DYNAMIC badge cron)
**Manba.** `05-CORE` §8. **DoD.** `PricingService` tartibi testlangan (unit, 10+ holat); `NEW/SALE/BESTSELLER` badge'lar cron bilan.
**Tekshirish.** `pnpm test -- pricing`

### - [ ] STEP-42 — Admin analytics summary + Order admin CRUD/eksport
**Manba.** `05-CORE` §5, §10. **DoD.** `GET /v1/admin/analytics/summary` 5 min cache; CSV eksport.
**Tekshirish.** `curl /v1/admin/analytics/summary?from=2026-09-01&to=2026-09-30`

---

## FAZA 4 — Masshtab va yangilanishlar

### - [ ] STEP-43 — Storage abstraksiyasi + S3/MinIO + variantlar + SSE
**Manba.** `07-FILES` §2–§5. **DoD.** `STORAGE_DRIVER=s3` bilan upload/serve; `files:migrate-to-s3` idempotent; orphan cron.
### - [ ] STEP-44 — Worker ajratish (`dist/worker`) + Redis throttler storage + Socket.IO Redis adapter
**Manba.** `06-PERF` §4, §8, §9. **DoD.** API 2 replica + 1 worker compose'da; rasm job'lari faqat worker'da; WS xonalar instanslar aro.
### - [ ] STEP-45 — Nest 11 + multer 2
**Manba.** `11-DEPS` §2, §3. **DoD.** e2e yashil; `pnpm audit --audit-level=high` toza.
### - [ ] STEP-46 — Prisma 6 + `omit` (S2 yakuni) + `relationJoins`
**Manba.** `11-DEPS` §4. **DoD.** `password` global `omit`; e2e yashil.
### - [ ] STEP-47 — TS strict bosqichlari (`noImplicitAny` → `strictNullChecks` modul-modul)
**Manba.** `09-TESTING` §6. **DoD.** `pnpm typecheck:strict` `common` + `auth` uchun yashil.
### - [ ] STEP-48 — Nginx + backup + staging + k6
**Manba.** `10-DEVOPS` §7–§9. **DoD.** Fayllar nginx'dan; kunlik `pg_dump` S3'da; k6 chegaralar staging'da o'tadi.
### - [ ] STEP-49 — Audit log + Settings + Feature flags
**Manba.** `13-IDEAS` §14–§16. **DoD.** Admin o'zgarishlari `AuditLog`da `before/after` bilan; `maintenance` flag public'ni 503 qiladi.

---

## FAZA 5 — Mahsulot backlog'i

`13-FEATURE-IDEAS.md` jadvalidagi tartibda; har feature roadmap'ga **shu shablonda** qadam sifatida qo'shiladi
(Manba / Fayllar / Bajarish / DoD / Tekshirish). Birinchi nomzodlar: Wishlist (§1), Buyurtma kuzatish (§5),
SEO (§22), Telegram Mini App (§8), Seller portal (§11).

---

## Bog'liqliklar (qisqa)

```
01 → 12(Docker) → 18(CI)
02,03 → 17(e2e auth)
19 → 30(Product) → 33(Catalog) → 35(Cart) → 36(Order) → 38(Payment)
24..29 (migratsiyalar) → 30
34 (mijoz auth) → 35
21 (soft-delete ext) → 30 dan oldin tavsiya
37 (sessiya cache) → istalgan vaqtda, 33 dan keyin foydali
```
