# ROADMAP — influencer-web (Next.js)

> Bir vaqtda 1 ta qadam. Har qadamdan keyin `pnpm typecheck && pnpm lint`.
> `Talab qilinadi:` — backendning qaysi qadami tayyor bo'lishi kerak.

---

## FAZA 0 — Skelet (W-01 … W-06)

### - [x] STEP-W-01 — Loyiha skeleti
**Bajarish.**
1. `pnpm create next-app@latest influencer-web --ts --tailwind --app --eslint --src-dir`
2. Port 3001 (`dev: "next dev -p 3001"`)
3. `tsconfig`: `strict: true`, `paths: { "@/*": ["./src/*"] }`
4. Prettier + `eslint-config-prettier`, `pnpm typecheck` skripti
5. `docs/` papkasi va `CLAUDE.md`
**DoD.** `pnpm build` xatosiz.

### - [x] STEP-W-02 — Tailwind mavzusi va shadcn/ui
**Bajarish.**
1. `pnpm dlx shadcn@latest init`
2. Ranglar: `primary`, `success` (o'sish), `danger` (pasayish), `muted`
3. Dark mode (`class` strategiyasi) — `next-themes`
4. Bazaviy komponentlar: `button, input, select, card, badge, dialog, sheet, skeleton, table, tabs, tooltip, slider, checkbox, avatar`
**DoD.** Test sahifada komponentlar ikkala mavzuda to'g'ri ko'rinadi.

### - [x] STEP-W-03 — i18n (uz / ru)
**Bajarish.** `next-intl`, `[locale]` segmenti, `middleware.ts` (default `uz`),
`messages/uz.json` va `ru.json`, til almashtirgich komponenti.
Backend so'rovlariga `Accept-Language` header qo'shiladi.
**DoD.** `/uz` va `/ru` ishlaydi, til almashadi.

### - [x] STEP-W-04 — API klient va tip generatsiyasi
**Talab qilinadi:** B-05
**Bajarish.**
1. `pnpm add -D openapi-typescript`, `api:gen` skripti
2. `shared/api/client.ts`: `apiFetch<T>(path, init)` — baseUrl, `Accept-Language`,
   `X-Client: web`, token, xatoni `{code, message, details}` ga aylantirish
3. `ApiError` klassi (`code` bilan)
4. `shared/api/query-keys.ts` — markazlashgan kalitlar
**DoD.** `pnpm api:gen` ishlaydi va `schema.d.ts` generatsiya bo'ladi.

### - [x] STEP-W-05 — TanStack Query provayderi
**Bajarish.** `QueryClientProvider`, `staleTime: 60s`, retry faqat tarmoq xatolarida
(4xx da retry yo'q), Devtools faqat dev'da.
**DoD.** Client Component'dan so'rov ishlaydi.

### - [x] STEP-W-06 — Layout: Header, Footer
**Bajarish.** Logo, qidiruv maydoni, kategoriyalar menyusi, til almashtirgich,
mavzu tugmasi, kirish/profil tugmasi. Mobil uchun `Sheet` menyu. Footer: statik sahifalar.
**DoD.** Layout barcha sahifalarda, mobil va desktopda to'g'ri.

---

## FAZA 1 — Auth (W-07 … W-09)

### - [x] STEP-W-07 — Kirish sahifasi (Telegram Login Widget, ADR-013)
**Talab qilinadi:** B-14
**Bajarish.**
1. `telegram-widget.js` yuklovchi `TelegramLoginButton` komponenti
   (`data-telegram-login`, `data-onauth` callback)
2. Callback payload -> `POST /api/auth/telegram` (Next Route Handler -> backend
   `/auth/web/telegram`) -> cookie'lar o'rnatiladi
3. `isNew` bo'lsa onboarding (kompaniya nomi so'raladi, ixtiyoriy)
4. Xatolar: `INVALID_WIDGET_DATA`, `WIDGET_DATA_EXPIRED` — qayta urinish tugmasi
5. Widget faqat `/setdomain` qilingan domenda ishlaydi — dev uchun mock kirish
   tugmasi (`NODE_ENV !== 'production'`)
**DoD.** Widget orqali kirish ishlaydi; foydalanuvchi Mini App'dagi bilan bitta akkaunt.

### - [x] STEP-W-08 — Sessiya boshqaruvi
**Bajarish.**
1. Route Handlerlar `/api/auth/*` (telegram, refresh, logout) — backendga proksi qiladi:
   refreshToken httpOnly cookie'ga, accessToken qisqa muddatli (15 daq) httpOnly
   cookie'ga yoziladi (SSR shu cookie'ni backendga forward qiladi)
2. Klientda accessToken FAQAT xotirada; ilova yuklanganda `/api/auth/refresh`
   chaqirilib xotiraga olinadi (localStorage TAQIQLANADI)
3. `middleware.ts` — himoyalangan yo'llar (`/favorites`, `/compare`, `/profile`)
4. Avtomatik refresh: 401 -> `/api/auth/refresh` -> qayta urinish (bir marta, mutex bilan)
5. `useAuth()` hook — `user`, `plan`, `isAuthenticated`
**DoD.** Sahifa yangilanganda sessiya saqlanadi; token muddati tugasa avtomatik yangilanadi.

### - [x] STEP-W-09 — Profil sahifasi
**Bajarish.** Ism, kompaniya, til sozlamalari (`PUT /auth/me`), joriy tarif ko'rsatkichi,
chiqish tugmasi.
**DoD.** Ma'lumot saqlanadi va header'da yangilanadi.

---

## FAZA 2 — Katalog (W-10 … W-16)

### - [x] STEP-W-10 — `InfluencerCard` komponenti
**Talab qilinadi:** B-37
**Bajarish.** Avatar, ism, tasdiqlangan belgisi, kategoriya, shahar,
platforma ikonalari + follower soni, ER, 30 kunlik o'sish (yashil/qizil ko'rsatkich bilan),
minimal narx, favorite tugmasi. Skeleton varianti.
**DoD.** Karta grid va ro'yxat ko'rinishida ishlaydi, mobilda ham.

### - [x] STEP-W-11 — Filter paneli
**Talab qilinadi:** B-37
**Bajarish.**
1. `GET /app/influencers/filters` dan **dinamik** quriladi (hardcode qilinmaydi)
2. Bloklar: kategoriya (daraxt, checkbox), platforma, davlat/shahar, til,
   followers (diapazon slider + qo'lda kiritish), ER (min), avgViews (min),
   o'sish (min), narx diapazoni, tier, faqat tasdiqlangan
3. Qo'llanilgan filterlar — o'chirish tugmali "chip"lar
4. Mobilda `Sheet` ichida, "Filtr (3)" tugmasi bilan
5. **Holat URL'da** — `useSearchParams` bilan sinxron
**DoD.** Filter o'zgarganda URL yangilanadi, sahifa yangilansa filter saqlanadi.

### - [x] STEP-W-12 — Katalog sahifasi
**Bajarish.**
1. `/catalog` — filter paneli + natijalar gridi
2. Tartiblash: mashhurlik, followers, ER, o'sish, yangilik
3. Sahifalash (`?page=`) — SEO uchun havolalar bilan
4. Bo'sh natija holati: taklif bilan ("filterni kengaytiring")
5. Yuklanish — skeleton kartalar
**DoD.** Filter va tartiblash ishlaydi, URL ulashilsa bir xil natija.

### - [x] STEP-W-13 — Kategoriya sahifalari
**Talab qilinadi:** B-21
**Bajarish.** `/catalog/[categorySlug]` — SSR, `generateStaticParams`,
`generateMetadata`, subkategoriya tablari, kategoriya tavsifi.
**DoD.** Kategoriya sahifasi server tomonda render bo'ladi (view-source'da kontent bor).

### - [x] STEP-W-14 — Global qidiruv (autocomplete)
**Bajarish.** Header'dagi qidiruv: `GET /app/influencers/suggest`, 250ms debounce,
klaviatura navigatsiyasi, `Cmd/Ctrl+K` qisqartmasi, "Barcha natijalar" havolasi.
**DoD.** Yozganda 300ms ichida takliflar chiqadi.

### - [x] STEP-W-15 — Dashboard (bosh sahifa)
**Talab qilinadi:** B-39
**Bajarish.** `GET /app/dashboard` — Server Component, bloklar:
hero + qidiruv, statistika, kategoriya plitalari, tavsiya etilganlar, eng mashhurlar,
trending, eng tez o'sayotganlar, yangi qo'shilganlar, kategoriya bo'yicha top.
Har bir blok — gorizontal scroll (mobil) / grid (desktop).
**DoD.** Bosh sahifa SSR, LCP < 2.5s.

### - [x] STEP-W-16 — Favorites
**Talab qilinadi:** B-40
**Bajarish.** Favorite tugmasi (optimistik yangilanish), `/favorites` sahifasi,
auth'siz bosilsa — kirish dialogi.
**DoD.** Qo'shish/o'chirish darhol ko'rinadi, xatolikda orqaga qaytariladi.

---

## FAZA 3 — Influencer profili (W-17 … W-21)

### - [x] STEP-W-17 — Profil sahifasi karkasi
**Talab qilinadi:** B-38
**Bajarish.** `/influencer/[slug]` — Server Component.
Hero: cover, avatar, ism, tasdiqlangan belgisi, kategoriyalar, shahar, tillar, bio.
Amallar: favorite, taqqoslashga qo'shish, ulashish.
Umumiy ko'rsatkichlar qatori: jami followers, ER, avgViews, o'sish, tier.
**DoD.** Sahifa SSR, `view-source` da kontent bor.

### - [x] STEP-W-18 — SEO metadata va JSON-LD
**Bajarish.** `generateMetadata` (title, description, OG image), `Person` JSON-LD,
kanonik URL, `hreflang`. `app/sitemap.ts` — `/public/sitemap` dan.
**DoD.** Rich Results Test xatosiz o'tadi.

### - [x] STEP-W-19 — Ijtimoiy tarmoq bloklari
**Bajarish.** Har bir tarmoq uchun karta: platforma ikonasi, username (havola),
followers, avgLikes, avgComments, avgViews, ER, viewRate, post chastotasi,
oxirgi yangilanish vaqti. Tab yoki akkordeon ko'rinishida.
**DoD.** Barcha tarmoqlar to'g'ri ko'rsatiladi, bo'sh qiymatlar "—" bilan.

### - [x] STEP-W-20 — O'sish grafigi
**Talab qilinadi:** B-29
**Bajarish.** Recharts `AreaChart`: davr tanlagich (30d / 90d / 1y),
metrika tanlagich (followers / ER / views), tooltip, o'sish foizi ko'rsatkichi.
Ma'lumot yetarli bo'lmasa — "Ma'lumot to'planmoqda" holati.
**DoD.** Grafik ikkala mavzuda va mobilda to'g'ri ko'rinadi.

### - [x] STEP-W-21 — Narxlar va aloqa bloki
**Bajarish.** Narxlar jadvali (platforma x format), aloqa ma'lumotlari.
`locked[]` da `contact` bo'lsa — blur + "Pro'ga o'ting" bloki.
**DoD.** Gating yoqilsa blok to'g'ri yashiriladi.

---

## FAZA 4 — Taqqoslash va qo'shimchalar (W-22 … W-28)

### - [x] STEP-W-22 — Taqqoslash
**Talab qilinadi:** B-41
**Bajarish.** Taqqoslash savati (localStorage, maks 4), pastdagi suzuvchi panel,
`/compare` sahifasi — `rows` formatidagi jadval, `best` qiymat yashil rangda,
mobilda gorizontal scroll, ustunni olib tashlash.
**DoD.** 2–4 influencer taqqoslanadi.

### - [ ] STEP-W-23 — ⏸ MVP-KEYIN — Saqlangan qidiruvlar (ADR-015)
**Talab qilinadi:** B-42
**Bajarish.** Katalogda "Qidiruvni saqlash", `/saved-searches` sahifasi, qayta qo'llash.
**DoD.** Saqlangan filter bir bosishda qayta qo'llanadi.

### - [x] STEP-W-24 — Ulashish
**Bajarish.** Ulashish dialogi: havolani nusxalash, Telegram, WhatsApp, X.
`navigator.share` mavjud bo'lsa mobilda native.
**DoD.** Havola to'g'ri OG preview bilan ulashiladi.

### - [x] STEP-W-25 — Statik sahifalar
**Talab qilinadi:** B-48
**Bajarish.** `/about`, `/terms`, `/privacy`, `/faq` — `GET /public/pages/:slug` dan, SSG + ISR.
**DoD.** Admin sahifani o'zgartirsa, revalidatsiyadan keyin yangilanadi.

### - [x] STEP-W-26 — Xatolik va yuklanish holatlari
**Bajarish.** `error.tsx`, `not-found.tsx`, `loading.tsx` har bir segmentda;
`ApiError.code` bo'yicha aniq xabarlar (`PLAN_REQUIRED`, `QUOTA_EXCEEDED` uchun maxsus UI);
offline holati.
**DoD.** Backend o'chirilganda ham sahifa xato bilan tushmaydi.

### - [x] STEP-W-27 — Analitika va performance
**Bajarish.** `POST /app/influencers/:id/view` (`useEffect`, bir marta),
`next/image` optimallashtirish, `dynamic import` og'ir komponentlar uchun (grafik),
`@next/bundle-analyzer` bilan tekshirish.
**DoD.** Lighthouse: Performance > 85, SEO > 95.

### - [x] STEP-W-28 — Deploy
**Bajarish.** `Dockerfile` (`output: 'standalone'`), env'lar (`NEXT_PUBLIC_API_URL`),
GitHub Actions (lint -> typecheck -> build), `robots.ts`.
**DoD.** Prod build ishlaydi va API'ga ulanadi.
