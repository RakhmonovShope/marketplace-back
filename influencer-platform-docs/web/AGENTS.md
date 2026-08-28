# AGENTS.md — influencer-web (Next.js)

> Ish boshlashdan oldin `docs/00-CONTEXT-AND-DECISIONS.md`, `docs/01-ARCHITECTURE.md`
> va `docs/03-API-CONTRACT.md` o'qilishi shart.

## Stack

- **Next.js 15** (App Router, React Server Components)
- TypeScript strict
- **Tailwind CSS 4** + **shadcn/ui**
- **TanStack Query v5** (klient tomondagi so'rovlar)
- **Zod** (forma validatsiyasi) + `react-hook-form`
- **Recharts** (o'sish grafiklari)
- `next-intl` (uz / ru)
- `openapi-typescript` — API tiplari **generatsiya qilinadi**
- Paket menejeri: **pnpm**

## Buyruqlar

```bash
pnpm dev                 # localhost:3001
pnpm build && pnpm start
pnpm lint
pnpm typecheck           # tsc --noEmit
pnpm api:gen             # Swagger'dan tiplarni yangilash
```

`package.json`:
```json
"api:gen": "openapi-typescript http://localhost:3000/api/docs/web-json -o src/shared/api/schema.d.ts"
```

## Papka strukturasi

```
src/
  app/
    [locale]/
      layout.tsx
      page.tsx                      # Dashboard (bosh sahifa)
      catalog/page.tsx              # Influencerlar katalogi
      catalog/[categorySlug]/page.tsx
      influencer/[slug]/page.tsx    # SSR — SEO uchun
      compare/page.tsx
      favorites/page.tsx
      saved-searches/page.tsx
      login/page.tsx
      profile/page.tsx
      (static)/about|terms|privacy/page.tsx
    api/                            # faqat kerak bo'lsa (BFF, cookie set)
    sitemap.ts
    robots.ts
  features/                         # feature-sliced
    auth/       { api, hooks, components, store }
    catalog/    { api, hooks, components }   # filter paneli, karta, ro'yxat
    influencer/ { api, hooks, components }   # profil bloklari, grafik
    compare/
    favorites/
    dashboard/
  shared/
    api/  { client.ts, schema.d.ts, query-keys.ts }
    ui/                             # shadcn komponentlari
    lib/  { format.ts, cn.ts }
    config/
  widgets/                          # Header, Footer, FilterPanel, InfluencerGrid
  i18n/  { messages/uz.json, messages/ru.json }
```

## Qat'iy qoidalar

1. **API tiplari qo'lda yozilmaydi** — faqat `pnpm api:gen`. `schema.d.ts` tahrirlanmaydi.
2. **Influencer profili va katalog — Server Component** (SEO). Faqat interaktiv
   qismlar (`filter paneli`, `favorite tugmasi`, `grafik`) `'use client'`.
3. **Raqam formatlash faqat `shared/lib/format.ts` da**: `formatFollowers(250000) -> '250K'`,
   `formatPercent(6.2) -> '6.2%'`, `formatPrice(3500000, 'UZS')`.
   Backend formatlangan matn qaytarmaydi.
4. **Xatoliklarni `code` bo'yicha ushlash**, `message` matni bo'yicha emas
   (`03-API-CONTRACT.md` §9).
5. **`locked[]` massivini hurmat qilish** — javobda maydon nomi bo'lsa,
   qiymat o'rniga "Pro" bloki ko'rsatiladi (hozir massiv doim bo'sh, lekin kod tayyor bo'lsin).
6. Barcha matnlar `i18n/messages/*` da — komponentda hardcode qilinmaydi.
7. Filter holati **URL'da** saqlanadi (`?categories=a,b&followers=100000-500000`) —
   havolani ulashish va orqaga qaytish ishlashi uchun.

## API klient

```ts
// src/shared/api/client.ts
import type { paths } from './schema';
// createClient(baseUrl) — accessToken'ni httpOnly cookie'dan oladi,
// 401 da /auth/refresh ga bir marta uriniladi (bir vaqtda bitta refresh — mutex),
// muvaffaqiyatsiz bo'lsa /login ga yo'naltiradi.
```

Server Component'lardan so'rov `fetch` bilan (cookie forward qilinadi),
Client Component'lardan TanStack Query bilan.

## SEO talablari (bu loyihada muhim)

- Har bir influencer sahifasida `generateMetadata`: title, description, OG image
- `JSON-LD` (`Person` + `InteractionCounter`) — influencer profilida
- `sitemap.ts` — `/public/sitemap` endpointidan slug'lar
- Kanonik URL, `hreflang` (uz/ru)
- Rasm — `next/image`, `priority` faqat birinchi ekranda

## Nima qilinmaydi

- `any` tipi (ESLint xato beradi)
- API javobini `as` bilan tiplash — generatsiya qilingan tiplar ishlatiladi
- Global state kutubxonasi (Redux/MobX) — TanStack Query + URL holati yetarli
- Backend logikasini frontend'da takrorlash (ER hisoblash va h.k.)
