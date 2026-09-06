# 00 — Audit xulosasi (4 repo)

> Tekshirilgan: backend — 27 modul, 22 Prisma modeli, 13 migratsiya, 11 unit-test fayli (102 test),
> Dockerfile/compose/nginx/CI; web — Next.js 16 (App Router, `proxy.ts`), 8 100 qator; admin — Vite + Mantine,
> 12 700 qator; miniapp — Vite + `@telegram-apps/sdk-react`, 6 400 qator. Barcha repolar lint/build o'tadi.

---

## 1. Holat: MVP tugagan, arxitektura kuchli

| Blok | Nima yaxshi (saqlanadi) |
|---|---|
| Arxitektura | ADR'lar amalda: `applyStats` yagona kirish nuqtasi, `InfluencerAggregateService` (denormalizatsiya), typed public search DTO + generic admin DSL (oq ro'yxat), Swagger 3 definition, `code` asosidagi xatolar |
| Auth | Telegram initData/Widget validatsiyasi to'g'ri (ikki xil secret), refresh rotatsiyasi + theft detection, bloklangan user tokeni ishlamaydi, admin login enumeration himoyasi |
| Ma'lumot | Snapshot tarixi, backfill qoidasi, `manualLock`, provider registry (YouTube/TGStat/RapidAPI/mock), ikki bosqichli import, kesh invalidatsiyasi |
| Frontend | Web: SSR + httpOnly cookie'lar + refresh mutex, URL — filter holatining yagona manbai, SEO (sitemap, alternates, JSON-LD). Admin: `CrudTable` + render-prop formalar, permission bo'yicha UI. Miniapp: native Telegram elementlar, lazy sahifalar, ~133KB gzip |
| DX | `openapi-typescript` tiplar, pino + `X-Request-Id`, Bull Board (dev), mock initData skriptlari, hujjatlar/ROADMAP intizomi |

## 2. Kritik topilmalar (P0 — real trafikdan oldin)

| # | Topilma | Qayerda | Ta'sir |
|---|---|---|---|
| 1 | **`trust proxy` yo'q.** Prod'da nginx ortida `req.ip` = nginx IP → throttler (120/min) **butun sayt uchun bitta bucket**; `ProfileView.ip`, `RefreshToken.ip`, ko'rish dedup (`viewdedup:*:ip`) — barcha anonim foydalanuvchilar bitta IP | `main.ts`, `nginx.conf` | Sayt 120 so'rov/daqiqadan keyin hammaga 429; ko'rish statistikasi noto'g'ri |
| 2 | **`requestContact` imzosi tekshirilmaydi.** `telegramBindPhone` faqat `contact.user_id === initData.user.id` ni tekshiradi; `contact` obyektini mijoz o'zi yasab istalgan telefonni `phoneVerified: true` bilan bog'laydi | `auth.service.ts` | Telefon soxtalashtirish |
| 3 | **Sentry ishlamaydi.** `Sentry.init` bor, lekin `captureException` hech qayerda yo'q; init `NestFactory.create` dan keyin → auto-instrumentation ham yo'q | `main.ts`, `http-exception.filter.ts` | Prod xatolari ko'rinmaydi |
| 4 | **Loglarda Bearer token.** pino-http default `req` serializer barcha header'larni yozadi; `redact` yo'q | `app.module.ts` | Token sizishi (log agregatorida) |
| 5 | **Swagger prod'da ochiq** (`/api/docs`, `admin-json`) | `swagger.setup.ts` | Admin API tuzilmasi oshkor |
| 6 | **`xlsx@0.18.5`** (npm nusxasi qoldirilgan; prototype pollution / ReDoS CVE) va **`multer@1.4.5`** (DoS CVE'lar) | `package.json` | Import orqali DoS |
| 7 | **`OptionalAuthGuard` eskirgan tokenni jimgina "anonim" qiladi** → web/miniapp 15 daqiqadan keyin `isFavorite=false`, refresh hech qachon boshlanmaydi (401 yo'q) | `optional-auth.guard.ts` | UX bug: sevimlilar "yo'qoladi" |
| 8 | **`Category.influencerCount` noto'g'ri**: import yo'li recount qilmaydi; DRAFT/ARCHIVED ham hisobga kiradi; `Category.delete` shu songa tayanadi | `import.service.ts`, `influencer.service.ts` | Katalogda noto'g'ri sonlar, kategoriyani o'chirib bo'lmaydi |
| 9 | **Web `next/image` `remotePatterns: https://**`** — istalgan hostdagi rasmni sizning serveringiz yuklab optimizatsiya qiladi (ochiq proxy) | `next.config.ts` | Trafik/CPU suiiste'moli |
| 10 | **Prisma `P2002` → 500.** Filter Prisma xatolarini map qilmaydi (Country.code, Language.code dublikati → Internal error) | `http-exception.filter.ts` | Admin noto'g'ri xato ko'radi |

## 3. Muhim bo'shliqlar (P1)

- **Ma'lumot olish strategiyasi**: real provayder kalitlari yo'q (`SYNC_MOCK_ENABLED`), TGStat pulli, Instagram/TikTok RapidAPI noaniq — mahsulotning yadrosi (analytics) hozircha qo'lda kiritish/importga tayanadi (`03-DATA-QUALITY`).
- **Performance**: har so'rovda `user + role` DB'dan (JwtStrategy), qidiruv `count + findMany` keshsiz, `recountViews` soatiga N ta `UPDATE`, aggregate har chaqiruvda 2× Redis `SCAN`, import satr-satr N+1, sync retry'lar 404 uchun ham (`02-BACKEND-PERFORMANCE`).
- **Observability**: metrikalar yo'q, health faqat db/redis, uptime tekshiruvi yo'q, backup hujjatlanmagan (`07-DEVOPS`).
- **Testlar**: backend e2e faqat boilerplate; frontend'larda test yo'q; CI DB'siz (`08-TESTING`).
- **Admin**: barcha sahifalar bitta bundle'da (lazy yo'q), ommaviy amallar N ta so'rov (bulk endpoint yo'q), `zustand`/`radash` ishlatilmaydi, `docs/AGENTS.md` da `services/i18n` bor — kodda yo'q (`05-ADMIN`).
- **Deferred (⏸)**: B-12 OTP/SMS, B-42/W-23 SavedSearch, B-47/A-25 Featured, B-41.4 saqlangan taqqoslash — `09-FEATURE-IDEAS` da yangi g'oyalar bilan birga ustuvorlashtirildi.
- **Hujjat drift**: master `00-CONTEXT` (v1.3 Mantine) bilan backend nusxasi (AntD) farq qiladi; admin `AGENTS.md` stack bo'limi eskirgan.

## 4. Raqamlar

| Ko'rsatkich | Backend | Web | Admin | Miniapp |
|---|---|---|---|---|
| Kod (qator, TS/TSX) | ~12 000 | ~8 100 (1 680 — sxema) | ~12 800 (3 600 — sxema) | ~6 400 (1 700 — sxema) |
| Testlar | 102 unit, 0 e2e | 0 | 0 | 0 |
| CI | lint/build/test → ghcr `:latest` | lint/typecheck/build → ghcr | lint/build → ghcr | typecheck/lint/build → ghcr |
| Deferred qadamlar | B-12, B-42, B-47 | W-23 | A-25 | — |

## 5. Tavsiya etilgan tartib

```
Hafta 1    P0: 01-BACKEND-SECURITY (B2-01…B2-08) + 07 §1 Sentry + 04 §1 remotePatterns
Hafta 2-3  P1: 02-PERFORMANCE (B2-10…B2-17) + 03 §1-2 (influencerCount, import) + 08 (e2e skelet)
Hafta 3-4  P1: 07 (metrics/health/CI/backup) + 05 (admin lazy/bulk) + 04 (web kesh/SEO)
Oy 2       P2: 03 §3 ma'lumot strategiyasi (creator connect) + 09 birinchi featurelar (ro'yxatlar, alertlar, media kit)
Doimiy     09-FEATURE-IDEAS dan tanlab olish; ⏸ bandlar
```
Qadamlar — `ROADMAP-V2.md`.
