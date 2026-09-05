# Marketplace Backend — Audit, optimizatsiya va rivojlantirish hujjatlari

> Yaratilgan sana: 2026-09-05. Kod bazasi to'liq o'qib chiqilgan holda yozildi
> (`src/**`, `prisma/schema.prisma`, `tools/generators`, `package.json`, build natijasi).

Bu papka — loyihani **hozirgi holatdan production-darajaga** olib chiqish uchun
kichik, mustaqil hujjatlar to'plami. Har bir hujjat bitta mavzuni yopadi va
o'zida aniq fayl yo'llari, kod namunalari va "nima uchun" izohlarini saqlaydi.

## Hujjatlar ro'yxati

| # | Fayl | Mavzu | Ustuvorlik |
|---|------|-------|-----------|
| 00 | [00-AUDIT-SUMMARY.md](./00-AUDIT-SUMMARY.md) | Hozirgi holat: kuchli tomonlar, kritik topilmalar, bo'shliqlar | Avval o'qing |
| 01 | [01-SECURITY.md](./01-SECURITY.md) | Xavfsizlik tuzatishlari (privilege escalation, parol hash sizishi, WS auth, SVG, Swagger) | **P0** |
| 02 | [02-BUGS-AND-QUICK-FIXES.md](./02-BUGS-AND-QUICK-FIXES.md) | Aniq buglar: `dist/src/main.js`, throttler, count/filter, 404 yo'q, env | **P0** |
| 03 | [03-DATA-MODEL.md](./03-DATA-MODEL.md) | Prisma schema tuzatishlari: OrderItem, Decimal, indekslar, Category daraxti, Store egasi | P1 |
| 04 | [04-API-CONVENTIONS.md](./04-API-CONVENTIONS.md) | Pageable v2 (whitelist), serializatsiya, xato kodlari, i18n, public/admin prefiks, OpenAPI export | P1 |
| 05 | [05-CORE-MARKETPLACE-FEATURES.md](./05-CORE-MARKETPLACE-FEATURES.md) | Yetishmayotgan yadro: Product, Cart, Order, Payment, Review, Promo, mijoz auth | P1 |
| 06 | [06-PERFORMANCE-CACHING.md](./06-PERFORMANCE-CACHING.md) | JWT sessiya cache, katalog cache, HTTP cache, Prisma pool, worker ajratish | P2 |
| 07 | [07-FILES-MEDIA.md](./07-FILES-MEDIA.md) | Storage abstraksiyasi (S3/MinIO), magic-byte validatsiya, variantlar, orphan tozalash | P2 |
| 08 | [08-OBSERVABILITY-OPERATIONS.md](./08-OBSERVABILITY-OPERATIONS.md) | pino + request id, Sentry, Prometheus, health (redis/disk), graceful shutdown | P1 |
| 09 | [09-TESTING-QUALITY.md](./09-TESTING-QUALITY.md) | Unit/e2e test bazasi, Testcontainers, coverage, TS strict, ESLint 9, husky | P1 |
| 10 | [10-DEVOPS-CI-CD.md](./10-DEVOPS-CI-CD.md) | Dockerfile, docker-compose, GitHub Actions, migratsiya strategiyasi, backup, nginx | P1 |
| 11 | [11-DEPENDENCIES-UPGRADES.md](./11-DEPENDENCIES-UPGRADES.md) | Keraksiz paketlar, Nest 11, Prisma 6, multer 2, ESLint 9, Node pin | P2 |
| 12 | [12-CODEGEN-DX-DOCS.md](./12-CODEGEN-DX-DOCS.md) | Plop generator buglari, `.env.example`, AGENTS.md yangilash, Swagger sifat | P2 |
| 13 | [13-FEATURE-IDEAS.md](./13-FEATURE-IDEAS.md) | Mahsulot g'oyalari backlog'i: seller portal, Telegram, promo engine, analytics, SEO | P3 |
| — | [ROADMAP.md](./ROADMAP.md) | **Ketma-ket qadamlar** (STEP-xx) — Maqsad / Fayllar / Bajarish / DoD / Tekshirish | Ish rejasi |

Ustuvorlik: **P0** — bu haftada, production'ga chiqishdan oldin majburiy.
**P1** — keyingi 2–4 hafta. **P2** — yuk oshganda / jamoa kengayganda. **P3** — mahsulot backlog'i.

## AI agent bilan ishlash tartibi

1. Yangi sessiyada avval `docs/00-AUDIT-SUMMARY.md`, keyin kerakli mavzu hujjatini o'qing.
2. Ishni `docs/ROADMAP.md` dagi qadamlar bo'yicha bering: *"ROADMAP.md dagi STEP-05 ni bajar"*.
   Bir vaqtda 1–3 qadamdan ortiq bermang.
3. Qadam tugagach `- [ ]` ni `- [x]` ga o'zgartiring va `Tekshirish` buyrug'ini ishga tushiring.
4. Har qadam oxirida: `pnpm lint && pnpm build` (keyinroq `pnpm test` ham) yashil bo'lishi shart.
5. Yangi qaror qabul qilinsa — tegishli hujjatning oxiriga "Qarorlar" bo'limiga yozing.

## Loyiha konvensiyalari o'zgarmaydi

Bu hujjatlar `AGENTS.md` va `.cursor/rules/*.mdc` dagi konvensiyalarni **bekor qilmaydi**,
balki ularni to'ldiradi. Modul tuzilmasi (5 fayl), `Uz`/`Ru` maydonlar, `@Permissions(...)`,
`PaginationFilterOrderRequest` — barchasi kuchda. Bu yerda o'zgartirish taklif qilingan joylar
(`04-API-CONVENTIONS.md`) `AGENTS.md` ga ham kiritilishi kerak (`12-CODEGEN-DX-DOCS.md`).
