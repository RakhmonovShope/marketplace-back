# 08 — Testlar (P1, barcha repolar)

> Hozir: backend 102 unit (formulalar, query-builder, guard'lar, Telegram validatorlar, aggregate) — yaxshi; e2e faqat boilerplate.
> Frontend'larda test yo'q. CI'da DB yo'q. Kontrakt o'zgarishi frontend'ga faqat runtime'da bilinadi.

---

## 1. Backend e2e — real Postgres/Redis (Testcontainers yoki CI services)

> ✅ Bajarildi (2026-09-06, B2-22): `test/setup/{env,global-setup,app,helpers}.ts`: alohida `influencer_test` bazasi (`prisma migrate deploy` yaratadi) + seed, Redis db=1 (`REDIS_DB` env qo'shildi), `configureApp()` main.ts bilan umumiy; har spec `resetDb` (TRUNCATE dinamik jadvallar, ADMIN qoladi) + `flushRedis`. 5 suite / 14 test (~6 s): auth (login→me→rotation→reuse 401/theft, initData, bind-phone imzo/403/eskirgan, OptionalAuthGuard, blok invalidatsiyasi), stats (applyStats→stats+snapshot+aggregate, growth null→25, backfill), import (template, CSV→VALIDATED preview NAME_MATCH/errors→apply PARTIAL, 10 001 satr FAILED, .exe 400), katalog (publish 409 missing, ota-kategoriya, count, followersMin, influencerCount, DTO whitelist, DSL, isFavorite, bulk), health/metrics. CI: Postgres/Redis services + `pnpm test:e2e`. Coverage threshold — keyin.

`test/jest-e2e.json` + `globalSetup` (`@testcontainers/postgresql`, `redis`): `prisma migrate deploy` + `seed` (rollar, FREE plan, kategoriyalar).
Har spec oldidan `TRUNCATE` (rollar/planlar qoladi). Fabrikalar: `test/factories/{influencer,socialAccount,user}.ts`.

Oqimlar (ustuvorlik bo'yicha):
1. **Auth**: admin login → me → refresh (rotation) → eski refresh → 401 + barcha sessiyalar bekor (theft); Widget imzo (test bot token bilan) → user upsert; initData → `needsPhone`; `bind-phone` imzo tekshiruvi (S2).
2. **Stats yagona kirish (ADR-005/006)**: `PUT /admin/social-accounts/:id/stats` → stats + snapshot + aggregate; `lockFields` → API sync (mock provider) qulflangan maydonni yozmaydi; backfill (`measuredAt` o'tmish) joriy holatni buzmaydi; `growth30d` 30 kunlik snapshot bilan to'g'ri.
3. **Import**: template → upload (CSV) → VALIDATED (preview, errors) → apply → PARTIAL/COMPLETED; xato satrlar o'tkazib yuboriladi; `influencerCount` recount (03 §1.1 tuzatilgach).
4. **Search**: typed DTO filterlari (kategoriya bola-ota, followers between, tiers, verifiedOnly), sort, `isFavorite` personalizatsiya, `INVALID_FILTER_FIELD` admin DSL'da.
5. **Publish qoidalari**: avatar/kategoriya/akkaunt yo'q → 409 `missing`.
6. **Plan gating** (`FEATURE_GATING_ENABLED=true` test env): `growth` → 403 `PLAN_REQUIRED`; profil `contact` maskalanadi + `locked`; kvota 429.
7. **Sync**: mock provider bilan `sync-account` → SUCCESS log; doimiy xato → `UnrecoverableError` (retry yo'q); `manualLock`.
8. **Tracking**: `view` dedup 1 soat; `recountViews`; `computeTrending`.

Skript: `pnpm test:e2e` CI `services:` bilan (`07-DEVOPS` §4). Coverage threshold: 60 % lines (asta oshiriladi).

---

## 2. Kontrakt testlari

- Backend `pnpm api:export` → `openapi/*.json` repo'ga commit (yoki artefakt). PR'da diff → `03-API-CONTRACT.md` bilan solishtirish (CHANGELOG).
- Frontend'lar: `api-schema.d.ts` artefaktdan generatsiya → `git diff --exit-code` (drift bo'lsa CI qizil).
- Schema snapshot testi: `expect(document.paths['/api/v1/app/influencers/search'].post.requestBody).toMatchSnapshot()` — muhim endpointlar uchun.

---

## 3. Frontend testlar

| Repo | Unit (vitest + RTL) | E2E (Playwright) |
|---|---|---|
| web | `filter-params.ts` (parse/serialize/toApiParams — 100 %), `format.ts`, `auth/store` (refresh mutex, 401 → refresh → retry), `filter-panel` (URL o'zgarishi) | Home → katalog filter → profil → (dev login) sevimli → taqqoslash; SEO: `sitemap.xml`, `robots.txt`, JSON-LD mavjudligi; `next build` ISR |
| admin | `useQueryParams`, `applyServerErrors`, `usePermission`, `CrudTable` (sort/page → URL), `makeForms` (server xatosi → field) | Login → influencer yaratish → akkaunt → stats kiritish → publish (staging backend yoki MSW mock) |
| miniapp | `pages/category/filters.ts`, `i18n t/lz`, `helpers/image.ts`, `useStartParamRedirect` | Mock initData bilan: home → kategoriya → filter (MainButton) → profil → share |

MSW (Mock Service Worker) — frontend unit/e2e uchun backend'siz; OpenAPI'dan `msw-auto-mock` bilan handler'lar (kontrakt bilan sinxron).

---

## 4. Yuk va barqarorlik

- `k6`: `search` (turli filter), `dashboard`, `profile` — 100 VU 2 daqiqa; p95 < 300 ms, xato < 0.5 % (staging).
- Chaos: Redis to'xtatilganda API 5xx bermasin (kesh miss → DB), sync/import navbati keyin davom etsin (BullMQ).
- Migratsiya sinovi: prod dump (anonim) → staging → `migrate deploy` → smoke.

---

## 5. Sifat darvozalari (CI)

- Backend: lint, typecheck, unit, e2e, `pnpm audit`, build, OpenAPI export.
- Frontend: lint (+oxlint), typecheck, unit, build, (web) Lighthouse CI, e2e (nightly staging).
- PR shabloni: "kontrakt o'zgardimi? ADR kerakmi? migratsiya orqaga mosmi? test qo'shildimi?".
