# ROADMAP-V2 — MVP'dan keyingi qadamlar (4 repo)

> **AI agent uchun ishlash tartibi (ROADMAP.md bilan bir xil):**
> 1. Bir vaqtda **1 ta qadam**. Qadam tugagach `- [ ]` → `- [x]` va hujjat bandiga "✅ (sana)".
> 2. Har qadam oxirida repo tekshiruvi (backend `pnpm lint && pnpm build && pnpm test`; frontend `pnpm typecheck && pnpm lint && pnpm build`).
> 3. `DoD` bajarilmasa keyingisiga o'tilmaydi. Har qadam — alohida commit (`fix(auth): …`, `feat(search): …`).
> 4. Prefikslar: **B2-** backend, **W2-** web, **A2-** admin, **M2-** miniapp, **X2-** bir nechta repo (tartib ko'rsatiladi).
> 5. Mavjud ADR'lar kuchda; yangi ADR kerak bo'lsa avval `00-CONTEXT` ga yoziladi (taklif: `09-FEATURE-IDEAS` oxirida).

Fazalar: **0** kritik (1 hafta) → **1** performance + ma'lumot sifati (2–3 hafta) → **2** kuzatuv/CI/test (2 hafta) →
**3** mahsulot: lead/ro'yxat/creator (1–2 oy) → **4** o'sish va monetizatsiya.

---

## FAZA 0 — Kritik tuzatishlar (production trafigidan oldin)

### - [x] B2-01 — `trust proxy` + Redis throttler storage ✅ 2026-09-06
**Manba.** `01-BACKEND-SECURITY` S1, `02-PERF` §8. **Fayllar.** `src/main.ts`, `src/common/env.validation.ts`, `src/app.module.ts`, `docker-compose.prod.yml`, `.env.example`
**Bajarish.** `TRUST_PROXY` env (default `false`, prod `1`) → Express `trust proxy`; `@nest-lab/throttler-storage-redis`; search route'ga `@Throttle({ default: { limit: 60, ttl: 60_000 } })`.
**DoD.** nginx ortida `req.ip` real IP (pino logda); 2 ta IP'dan alohida limit.
**Tekshirish.** `curl -H "X-Forwarded-For: 1.2.3.4" localhost:3000/api/v1/health` → logda `ip: 1.2.3.4` (TRUST_PROXY=1 bilan); TRUST_PROXY=false da `::1`.

### - [x] B2-02 — `requestContact` imzosini tekshirish ✅ 2026-09-06
**Manba.** `01` S2. **Fayllar.** `src/api/auth/telegram/validate-contact.ts` (+spec), `auth.service.ts`, `auth.dto.ts`, `error-codes.ts`; miniapp `useBindPhone` xom natijani yuborishini tasdiqlash.
**DoD.** `contact` imzosiz/soxta → 401 `INVALID_CONTACT_DATA`; to'g'ri imzo (test bot token bilan yasalgan) → telefon bog'lanadi.
**Tekshirish.** `pnpm test -- validate-contact`.

### - [x] B2-03 — Loglarda token redaction + `userId` ✅ 2026-09-06
**Manba.** `01` S3. **Fayllar.** `src/app.module.ts`
**DoD.** Logda `authorization: "[redacted]"`; `userId` maydoni bor; `/files/`, `/api/docs` auto-log'dan tashqarida.
**Tekshirish.** `curl -H "Authorization: Bearer abc" …/auth/me` → log qatorida `abc` yo'q.

### - [x] B2-04 — `OptionalAuthGuard`: eskirgan token → 401 ✅ 2026-09-06
**Manba.** `01` S6. **Fayllar.** `src/api/auth/optional-auth.guard.ts` (+spec)
**DoD.** Token yo'q → anonim; token yaroqsiz → 401 `UNAUTHORIZED`; web/miniapp refresh oqimi ishlaydi (16 daqiqadan keyin `isFavorite` to'g'ri).
**Tekshirish.** e2e: eskirgan token bilan `POST /app/influencers/search` → 401.

### - [x] B2-05 — Sentry ishga tushirish (backend) ✅ 2026-09-06
**Manba.** `07-DEVOPS` §1. **Fayllar.** `src/instrument.ts`, `src/main.ts`, `src/common/filters/http-exception.filter.ts`, processor'lar
**DoD.** `SENTRY_DSN` bilan sun'iy 500 (`GET /api/v1/admin/__boom` test route yoki mock) Sentry'da ko'rinadi, `requestId` bilan; DSN'siz hech narsa buzilmaydi.

### - [x] B2-06 — Swagger prod'da yopiq + Prisma xatolarini map qilish ✅ 2026-09-06
**Manba.** `01` S4, S7. **Fayllar.** `swagger.setup.ts`, `env.validation.ts`, `http-exception.filter.ts`, `error-codes.ts` (`CONFLICT`)
**DoD.** `NODE_ENV=production` `/api/docs` 404 (yoki basic auth); `Country.code` dublikati → 409 `CONFLICT` `details.target`.

### - [x] B2-07 — `xlsx`/`multer`/`dotenv` yangilash + import limitlari ✅ 2026-09-06
**Manba.** `01` S5. **DoD.** `pnpm audit --audit-level=high` toza; XLSX import ishlaydi (e2e); 10MB/10k satr limiti.

### - [x] B2-08 — `Category.influencerCount` to'g'ri hisob + import slug-merge himoyasi ✅ 2026-09-06
**Manba.** `03-DATA-QUALITY` §1.1, §1.2. **Fayllar.** `src/api/category/category-count.service.ts`, `influencer.service.ts` (publish/delete/restore), `import.service.ts`, `import.parser.ts` (`slug` ustuni, `NAME_MATCH` warning), cron.
**DoD.** Count faqat PUBLISHED+active; importdan keyin to'g'ri; ism mos kelsa preview'da ogohlantirish, default — yangi yozuv.

### - [ ] W2-01 — `next/image` `remotePatterns` cheklash + CSP sarlavhalari
**Manba.** `04-WEB` §1, §8. **Fayllar.** `next.config.ts`, `.env.example`
**DoD.** Begona host `/_next/image?url=` → 400; API/Telegram/ytimg rasmlari ishlaydi; CSP bilan Login Widget ishlaydi.

### - [ ] X2-01 — Sentry frontend'larda (web `@sentry/nextjs`, admin/miniapp `@sentry/react`)
**Manba.** `07` §1. **DoD.** ErrorBoundary'dan xato Sentry'da, release = git SHA (CI build-arg).

---

## FAZA 1 — Performance va ma'lumot sifati

### - [ ] B2-10 — JwtStrategy user keshi (Redis 60 s) + invalidatsiya
**Manba.** `02` §1. **DoD.** Himoyalangan so'rovda DB query 0 (kesh hit); block/rol o'zgarishi darhol ta'sir qiladi (test).

### - [ ] B2-11 — Qidiruv: count keshi, anonim natija keshi (30 s), kategoriya bolalari keshdan, `/count` endpoint
**Manba.** `02` §2. **DoD.** Bir xil anonim so'rov 2-marta DB'ga bormaydi (log); miniapp count 400 ms debounce.

### - [ ] B2-12 — `recountViews` bitta SQL + `ProfileView`/`SearchLog` retention
**Manba.** `02` §3, `01` S9. **DoD.** 10k influencer uchun < 2 s; 90/180 kundan eski yozuvlar kunlik o'chiriladi.

### - [ ] B2-13 — Aggregate: aniq kalit `del`, batch `recalculate(ids)`, dashboard dirty-flag
**Manba.** `02` §4, §10. **DoD.** `SCAN` chaqiruvi yo'q (Redis `MONITOR`); import 1 000 satrda dashboard keshi 1 marta tozalanadi.

### - [ ] B2-14 — Import: referenslarni oldindan yuklash (Map), N+1 yo'q
**Manba.** `02` §5. **DoD.** 5 000 satr STATS < 3 daqiqa (lokal); query soni satr soniga chiziqli emas.

### - [ ] B2-15 — Sync: `UnrecoverableError`, provayder rate limit/kvota, ustuvorlik
**Manba.** `02` §6. **DoD.** 404 provayder xatosi retry qilinmaydi; YouTube kunlik byudjet env bilan cheklanadi; log shovqini kamaygan.

### - [ ] B2-16 — Statik fayllar: cache header'lar, nginx alias, `File.path` nisbiy
**Manba.** `02` §7, `07` §3. **DoD.** `/files/...` javobida `Cache-Control: immutable`; nginx to'g'ridan-to'g'ri beradi; `PUBLIC_URL` o'zgarsa URL'lar to'g'ri.

### - [ ] B2-17 — Worker ajratish: `QUEUE_WORKERS_ENABLED`, `BOT_ENABLED` defaultlari, compose `worker`
**Manba.** `02` §9, `07` §3. **DoD.** `app` (2 replica) job ishlamaydi va bot ochmaydi; `worker` — hammasi.

### - [ ] B2-18 — Analytics: `growth30d` nullable, trending damping, popularity weights → recalculate job
**Manba.** `03` §1.3, §1.4, §3.4. **DoD.** Yangi influencer `growth30d: null`; weights saqlansa navbatga `recalculate-all`; frontend'lar `null` ko'rsatadi (W2/M2/A2 mos qadamlar).

### - [ ] B2-19 — Indekslar va Prisma sozlamalari
**Manba.** `02` §11. **DoD.** `minPrice`/`avgViews` indekslari migratsiyada; dublikat slug indekslari olib tashlangan; sekin query logi.

### - [ ] A2-01 — Sahifalarni lazy yuklash + chunk'lar + analyzer
**Manba.** `05-ADMIN` §1. **DoD.** Boshlang'ich JS 2× kichik (analyzer skrinshoti); barcha route'lar ishlaydi.

### - [ ] B2-20 + A2-02 — Bulk endpoint + admin bulk UI
**Manba.** `05` §2. **DoD.** 100 ta influencer publish → 1 so'rov, natija modal (`ok/failed`).

### - [ ] W2-02 — Anonim katalog keshi + filterli URL'lar `noindex/canonical` + kategoriya sitemap
**Manba.** `04` §2. **DoD.** Anonim `/catalog` SSR 60 s revalidate; `?followers=` bilan `<meta name="robots" content="noindex">`; sitemap'da kategoriyalar.

### - [ ] M2-01 — Count debounce, `avatarThumbUrl`, rasm fallback
**Manba.** `06-MINIAPP` §1, §2 (+ backend kontrakt `InfluencerCardDto.avatarThumbUrl`). **DoD.** Ro'yxatda thumb (≤ 20KB) yuklanadi; variant yo'q bo'lsa original.

---

## FAZA 2 — Kuzatuv, CI, testlar

### - [ ] B2-21 — Prometheus metrikalar + `/health/live|ready`
**Manba.** `07` §2. **DoD.** `/metrics` da http histogram va navbat gauge; Redis to'xtasa `ready` 503, `live` 200.

### - [ ] B2-22 — e2e bazasi (Testcontainers/CI services) + auth, stats, import, search oqimlari
**Manba.** `08-TESTING` §1. **DoD.** `pnpm test:e2e` 8 oqim yashil; CI'da ishlaydi.

### - [ ] X2-02 — CI: SHA tag'lar, `pnpm audit`, dependabot, OpenAPI export + frontend drift tekshiruvi
**Manba.** `07` §4, `08` §2. **DoD.** Backend PR'da `openapi/*.json` diff; frontend CI drift'da qizil; image `:sha` bilan.

### - [ ] X2-03 — Backup (pg_dump → S3), Redis appendonly, staging muhiti + test bot
**Manba.** `07` §5, §6. **DoD.** Kunlik dump S3'da; restore sinovi hujjatlangan; staging URL'lar.

### - [ ] W2-03 / A2-03 / M2-02 — Frontend unit testlar (vitest) + Playwright smoke
**Manba.** `08` §3. **DoD.** Har repo'da ≥ 10 unit test, 1 smoke e2e CI'da (nightly).

### - [ ] W2-04 — Analytics (Plausible) + `contact_click` hodisasi + Web Vitals + Lighthouse CI
**Manba.** `04` §4. **DoD.** Dashboard'da voronka (search → profile → contact); LCP < 2.5 s home/profil.

---

## FAZA 3 — Mahsulot: aloqa zanjiri, ro'yxatlar, creator

### - [ ] B2-30 + W2-10 + M2-10 + A2-10 — Lead/aloqa oqimi (`ContactRequest`)
**Manba.** `09-FEATURE-IDEAS` §5. **DoD.** Aloqa tugmasi hodisa yozadi; biznes "so'rovlarim"; admin lead statistikasi.

### - [ ] B2-31 + W2-11 + M2-11 — Ro'yxatlar (collections)
**Manba.** `09` §6. **DoD.** Nomlangan ro'yxatlar, favorites migratsiyasi default ro'yxatga, eksport CSV.

### - [ ] B2-32 + W2-12 + M2-12 — Saqlangan qidiruv (B-42/W-23 ⏸) + taqqoslashni saqlash/ulashish (B-41.4 ⏸)
**Manba.** `09` §11, §12. **DoD.** `/compare/<id>` public; `startapp=cmp_<id>`; saqlangan qidiruv ro'yxati.

### - [ ] B2-33 — Alertlar: `notification` navbati, Telegram bot xabarlari, `requestWriteAccess`
**Manba.** `09` §3. **DoD.** Followers ±10 % → xabar; saqlangan qidiruvga yangi mos → kunlik digest.

### - [ ] B2-34 + A2-11 + W2-13 + M2-13 — Creator claim + OAuth connect (ADR-016)
**Manba.** `09` §1, `03` §2. **DoD.** YouTube OAuth ulangan akkaunt `OWNER_API` bilan sinxronlanadi; admin claim moderatsiyasi; creator o'z narxlarini tahrirlaydi.

### - [ ] B2-35 — Auditoriya sifati + kategoriya benchmark'lari
**Manba.** `03` §3.1–3.2. **DoD.** `qualityScore`, `CategoryBenchmark` kunlik; kartada belgi; filter `qualityMin`.

### - [ ] B2-36 + W2-14 — Programmatik SEO landing'lar (ADR-018)
**Manba.** `09` §10, `04` §2. **DoD.** `/catalog/<cat>/<city>` sahifalari unikal metadata bilan; sitemap; Search Console'da indekslangan.

### - [ ] B2-37 + W2-15 + M2-14 — O'xshash influencerlar + qidiruv sifati (ranking, translit)
**Manba.** `09` §16–17. **DoD.** Profilda 6 ta o'xshash; `Азиз` → `Aziz` topiladi.

---

## FAZA 4 — O'sish va monetizatsiya

### - [ ] B2-40 + W2-20 + M2-20 — To'lov (Payme/Click, Telegram Stars) + obuna + gating yoqish
**Manba.** `09` §13. **DoD.** Sandbox to'lov → PRO obuna; `FEATURE_GATING_ENABLED=true` bilan `locked` maydonlar va kvota ishlaydi; webhook idempotent.

### - [ ] B2-41 + W2-21 — Jamoa akkauntlari (Organization)
### - [ ] B2-42 + A2-20 — Featured placement (B-47/A-25 ⏸)
### - [ ] B2-43 — Media kit PDF + eksport
### - [ ] B2-44 — Public partner API (ApiKey, kvota)
### - [ ] B2-45 — Bot inline rejimi + share card rasmi
### - [ ] B2-46 + A2-21 — Audit log, dublikat merge, rejalashtirilgan hisobotlar, shikoyatlar
### - [ ] X2-10 — EN tili (nameI18n), akkauntni o'chirish/eksport, PWA

---

## Bog'liqliklar (qisqa)

```
B2-01..08 (kritik) → hammasi
B2-04 (OptionalAuthGuard) → W2/M2 sevimlilar UX to'g'ri
B2-11 (count endpoint) → M2-01
B2-17 (worker) → B2-33 (alertlar navbati)
B2-22 (e2e) → FAZA 3 qadamlarida DoD sifatida e2e talab qilinadi
B2-30 (lead) → B2-40 (to'lov modeli)
B2-34 (creator) → B2-35 (benchmark sifati oshadi), B2-42 (featured o'zi sotib oladi)
```
