# 04 — Web (`influencer-web`, Next.js 16)

> Holat: W-01…W-28 tugagan (W-23 ⏸). SSR + httpOnly cookie sessiya, URL-first filterlar, SEO asoslari — yaxshi.
> Quyida: xavfsizlik/xarajat (P0), kesh va SEO (P1), UX/analytics (P2).

---

## 1. `next/image` — ochiq rasm proxy (P0)

> ✅ Bajarildi (2026-09-06, W2-01): `remotePatterns`: faqat API host (`NEXT_PUBLIC_API_URL`), `t.me`, `**.telegram-cdn.org`, `**.telesco.pe`, `i.ytimg.com`, `yt3.ggpht.com` + `NEXT_PUBLIC_IMAGE_HOSTS`; `minimumCacheTTL` 86400, avif/webp; dev'da `dangerouslyAllowLocalIP` (Next 16 SSRF himoyasi localhost'ni bloklaydi). Tekshirildi: example.com → 400, localhost API va t.me → 200.

`next.config.ts`: `remotePatterns: [{ protocol: 'https', hostname: '**' }]` → `/_next/image?url=https://istalgan-sayt/…` orqali **istalgan** rasm sizning
serveringizda yuklab optimizatsiya qilinadi (CPU/trafik suiiste'moli, SSRF'ga yaqin).
**Yechim.** Faqat kerakli hostlar: API domeni (`NEXT_PUBLIC_API_URL` host), `t.me`/`cdn*.telegram-cdn.org` (Telegram avatarlari), provayder thumbnail hostlari (`i.ytimg.com`).
`images.minimumCacheTTL = 86400`, `formats: ['image/avif','image/webp']`. Env orqali ro'yxat: `NEXT_PUBLIC_IMAGE_HOSTS`.

---

## 2. Anonim sahifalar keshi va SEO (P1)

> ✅ Bajarildi (2026-09-06, W2-02): `SearchAnonymousCached` (`unstable_cache`, 60 s, tag `catalog`) — token'siz `/catalog` va kategoriya sahifalari uchun (Next data-cache POST fetch'ni keshlamaydi); token bo'lsa `no-store`. `listingSeo`: filter/qidiruv/sort bilan URL → `robots: noindex, follow` + canonical asosiy ro'yxat; sahifalash canonical `?page=N`. Sitemap'ga kategoriya sahifalari (uz/ru alternates). Tekshirildi (`next start`): 3 anonim yuklash → backend'ga 1 so'rov; `?followers=` → `<meta name=robots content="noindex, follow">`; sitemap'da `/catalog/<slug>`.

| Sahifa | Hozir | Muammo | Yechim |
|---|---|---|---|
| `/catalog` (`(list)/page.tsx`) | `cache: 'no-store'`, token forward | Har crawler/anonim so'rov → backend `search` (count+findMany) | Token bo'lmasa `next: { revalidate: 60 }` (yoki `unstable_cache`), `isFavorite` — client-side (`useFavoriteIds`) |
| `/catalog?…` filterli URL'lar | Cheksiz kombinatsiya indekslanadi | Crawl byudjeti, dublikat kontent | `generateMetadata`: filter bo'lsa `robots: { index: false, follow: true }` + `canonical: /catalog` (yoki `/catalog/[categorySlug]`) |
| `/influencer/[slug]` | `revalidate: 300` + `ViewTracker` | OK | `generateStaticParams` top-500 slug (ISR), `lastModified` sitemap'da (bor) |
| Home | `revalidate: 300` | OK | `stale-while-revalidate` Cache-Control (Next default) |

Qo'shimcha SEO (`09-FEATURE-IDEAS` §10): **programmatik landing sahifalar** — `/catalog/food/tashkent`, `/platform/instagram`, `/tier/micro` (`generateMetadata` unikal title/description, ichki havolalar). Backend: `GET /public/seo/landing?category&city&platform` (count + top-10) — keshlanadi.

`robots.ts` — `disallow: ['/api/', ...]` bor; `Sitemap` — kategoriya sahifalari yo'q → qo'shish (`/catalog/[categorySlug]`).

---

## 3. Sessiya nozikliklari (P1)

- `OptionalAuthGuard` bugi (backend `01` S6) tuzatilgach web'da hech narsa o'zgarmaydi — 401 → `doRefresh` (mutex bor) → takror. Tekshirish: 16 daqiqa ochiq qolgan sahifada sevimli tugmasi to'g'ri.
- `proxy.ts`: himoya faqat cookie **mavjudligi** bo'yicha (`inf_rt`) — eskirgan cookie bilan `/favorites` ochiladi, keyin client `guest` → bo'sh sahifa. `favorites/page.tsx` da `status === 'guest'` → login'ga redirect (client) yoki server component `getAccessToken()` yo'q bo'lsa `redirect('/login')`.
- `apiFetch` server tomonida `Accept-Language` faqat `locale` berilsa — `sitemap.ts` da yo'q (default `uz`) — OK.
- `logout` → `queryClient.clear()` — OK; `compare` store (localStorage?) tozalanmaydi — ixtiyoriy.
- Widget `auth_date` 5 daqiqa: login sahifasi uzoq ochiq qolsa `WIDGET_DATA_EXPIRED` → xabar + widget'ni qayta render (bor bo'lsa tekshiring).

---

## 4. Analytics va o'lchov (P1)

> ✅ Bajarildi (2026-09-06, W2-04): Plausible (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN/HOST`, nonce'li `<Script>`, CSP script/connect hostlari), `track()` yordamchisi; hodisalar: `search` (natija soni, filtered), `profile_view`, `contact_click` (kanal+slug — lead), `favorite_add/remove`, `share_click`, `login`, `web_vitals` (`useReportWebVitals`). Backend `POST /app/influencers/:id/contact-click` → `ContactClick` jadvali + `Influencer.contactClickCount` (1 soat dedup, retention; admin javobida). Lighthouse CI (`lighthouserc.json`, nightly workflow, warn darajasi): lokal desktop — home perf 100 / LCP 775 ms, katalog perf 99 / LCP 904 ms, 445–467 KB. Voronka (search → profile → contact) Plausible dashboardida event'lar asosida quriladi — real DSN/domen deploy'da.

W-27 "analitika" bajarilgan deb belgilangan, lekin kodda `plausible/gtag/posthog/umami` topilmadi. Mahsulot metrikalarisiz o'sish qarorlari yo'q.
- **Plausible** (self-host, cookie'siz, GDPR-yengil) yoki **PostHog** (voronka, session replay). Event'lar: `search`, `filter_apply`, `profile_view`, `favorite_add`, `compare_open`, `contact_click` (⚠️ eng muhim — "lead"), `share_click`, `login`.
- Backend `contact_click` → `POST /app/influencers/:id/contact-click` (ProfileView kabi) — biznes uchun "necha marta aloqa ochildi" (creator'lar uchun qiymat, monetizatsiya asosi).
- Web Vitals: `reportWebVitals` → Plausible/Sentry. Lighthouse CI (`07-DEVOPS` §5) — LCP < 2.5 s (home, profil).

---

## 5. UX va kod sifati (P2)

- `filter-panel.tsx` 534 qator → `FilterSection` komponentlari (`RangeFilter`, `MultiSelectFilter`), `useFilterDraft` hook.
- `influencer/[slug]/page.tsx` 423 qator → `ProfileHeader`, `AccountsSection`, `PricesSection`, `ContactCard` (server komponentlar).
- Skeleton'lar: `catalog/(list)/loading.tsx` bor; `influencer/[slug]/loading.tsx` yo'q → qo'shish.
- `error.tsx` global bor; `not-found.tsx` bor. `global-error.tsx` (root layout xatosi) yo'q.
- Til almashtirganda URL prefiksi o'zgaradi (next-intl) — profil sahifasida `alternates` bor; kategoriya sahifasida ham `generateMetadata` `alternates` tekshiring.
- Dark mode (next-themes) — `Image` avatarlarida `bg` placeholder; `InfluencerCard` da CLS oldini olish (`sizes`, `aspect-ratio`).
- `dev-ui` sahifasi prod build'da ham bor → `robots` disallow qilingan, lekin `notFound()` prod'da yaxshiroq.

---

## 6. PWA va offline (P2)

`OfflineBanner` bor. `manifest.webmanifest` + `next-pwa`/`serwist`: install prompt (Android), ikonka, `catalog`/profil sahifalarini runtime cache (stale-while-revalidate). Telegram brauzeri (in-app) uchun `theme-color`.

---

## 7. Bundle va performance (P2)

- `recharts` faqat `growth-chart` da (`dynamic` — 1 joy, tekshirildi) — OK. `lucide-react` tree-shake (named import — OK).
- `radix-ui` monolit paket (`radix-ui@1.6`) — barcha primitivlar; `@radix-ui/react-*` alohida paketlar bilan bundle kichikroq bo'ladi (analyzer bilan solishtiring: `ANALYZE=1 pnpm build`).
- Fontlar: `Geist` + `Geist_Mono` — mono kerak bo'lmasa olib tashlash (−30KB).
- `sonner`, `next-themes` — yengil, OK.

---

## 8. Xavfsizlik (qisqa)

> ✅ Bajarildi (2026-09-06, W2-01): `proxy.ts` har so'rovda nonce + CSP (`shared/security/csp.ts`: script nonce+'strict-dynamic'+telegram.org, img-src API/Telegram/YouTube hostlari, frame-src oauth.telegram.org, frame-ancestors 'none'); login sahifasida `'unsafe-eval'` — telegram-widget.js `data-onauth` ni eval qiladi (kelajakda `data-auth-url` oqimi bilan olib tashlash mumkin); next-themes inline skriptiga nonce (`ThemeProvider nonce`), shu sabab barcha sahifalar dynamic. Statik sarlavhalar `next.config headers()`: X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy. Dev'da CSP o'chiq; prod'da `CSP_ENABLED=false` / `CSP_REPORT_ONLY=true`. Tekshirildi (`next start`): barcha inline skriptlar nonce bilan (0 ta nonce'siz), sahifalar 200. Widget'ni brauzerda tekshirish — deploy'dan keyin.

- `Content-Security-Policy` yo'q (Next default'da yo'q). Telegram widget (`telegram.org`), rasm hostlari, API — `next.config headers()` bilan CSP (`script-src 'self' https://telegram.org`, `img-src 'self' data: https://<api> https://t.me ...`, `connect-src 'self' https://<api>`).
- `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (Telegram in-app brauzer iframe emas — OK).
- Dev route `/api/auth/dev` prod'da 403 — OK.

---

## Qarorlar (taklif)

- Analytics: Plausible (self-host) — cookie banner shart emas.
- Programmatik SEO sahifalari: kategoriya × shahar × platforma (backend endpoint bilan).
