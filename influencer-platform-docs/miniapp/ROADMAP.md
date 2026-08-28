# ROADMAP — influencer-miniapp

> Bir vaqtda 1 ta qadam. Har qadamdan keyin `pnpm typecheck && pnpm build`.
> Telegram HTTPS talab qiladi — dev uchun `cloudflared tunnel` yoki `ngrok`.

---

## FAZA 0 — Skelet va Telegram integratsiyasi (M-01 … M-07)

### - [ ] STEP-M-01 — Loyiha skeleti
**Bajarish.**
1. `pnpm create vite influencer-miniapp --template react-ts`
2. Port 3002, `strict: true`, `paths: { "@/*": ["./src/*"] }`
3. Tailwind CSS 4, Prettier, ESLint, `pnpm typecheck`
4. `docs/` va `CLAUDE.md`
**DoD.** `pnpm build` xatosiz.

### - [ ] STEP-M-02 — Telegram SDK boshlanishi
**Bajarish.**
1. `pnpm add @telegram-apps/sdk-react`
2. `shared/telegram/init.ts` — `AGENTS.md` dagi ketma-ketlik
3. `useTelegram()` hook: `user`, `platform`, `colorScheme`, `isTelegram`
4. Telegram tashqarisida ochilsa — "Telegram'da oching" ekrani + QR/havola
5. Dev rejimda mock `initData` (`VITE_MOCK_INIT_DATA`)
**DoD.** Telegram'da ochilganda `initData` va foydalanuvchi ma'lumoti konsolda ko'rinadi.
**Tekshirish.** Tunnel URL'ni BotFather'da Mini App sifatida sozlab ochish.

### - [ ] STEP-M-03 — Mavzu va CSS o'zgaruvchilari
**Bajarish.** `themeParams.bindCssVars()`, Tailwind konfiguratsiyasida
`bg-tg`, `text-tg`, `hint-tg`, `button-tg` kabi utilitalar; light/dark avtomatik.
`viewport.expand()`, safe area (iOS) hisobga olinadi.
**DoD.** Telegram mavzusi almashsa ilova ranglari darhol o'zgaradi.

### - [ ] STEP-M-04 — API klient va tip generatsiyasi
**Talab qilinadi:** B-05
**Bajarish.** `api:gen` skripti, `apiFetch` (baseUrl, `X-Client: miniapp`,
`Accept-Language` — Telegram `languageCode` dan), `ApiError`.
**DoD.** `pnpm api:gen` ishlaydi.

### - [ ] STEP-M-05 — Auth (ADR-004) ⚠️ kritik
**Talab qilinadi:** B-15
**Bajarish.**
1. Ilova ochilganda `POST /auth/telegram/init { initData }`
2. Tokenlar `sessionStorage` + xotirada; 401 da refresh
3. `needsPhone === true` bo'lsa — telefon so'rash ekrani:
   `requestContact()` -> `POST /auth/telegram/bind-phone`
4. Telefon so'rash **majburiy emas** — "Keyinroq" tugmasi bo'ladi
   (faqat favorites/compare uchun talab qilinadi)
5. `INVALID_INIT_DATA` / `INIT_DATA_EXPIRED` — qayta urinish ekrani
**DoD.** Telegram'da ochilganda foydalanuvchi avtomatik kiradi, hech qanday forma to'ldirmaydi.

### - [ ] STEP-M-06 — Routing va navigatsiya
**Bajarish.**
1. `HashRouter`, sahifalar: `/`, `/catalog`, `/category/:slug`, `/influencer/:slug`,
   `/search`, `/favorites`, `/compare`, `/profile`
2. `BackButton` — router tarixi bilan bog'lanadi (ildizda yashiriladi)
3. Pastki tab bar: Bosh sahifa, Katalog, Saqlanganlar, Profil
4. `startapp=inf_<slug>` -> `/influencer/<slug>` ga yo'naltirish
**DoD.** Telegram orqaga tugmasi to'g'ri ishlaydi, deep link profilni ochadi.

### - [ ] STEP-M-07 — Bazaviy UI komponentlari
**Bajarish.** `Button, Card, Sheet, Chip, Skeleton, Avatar, Badge, Input, Slider, Tabs, EmptyState`
— o'z komponentlarimiz, Telegram mavzusiga moslashgan, minimal CSS.
**DoD.** Bundle hajmi tekshiriladi (`pnpm build` -> dist hajmi < 200KB gzip).

---

## FAZA 1 — Asosiy ekranlar (M-08 … M-14)

### - [ ] STEP-M-08 — `InfluencerCard` (mobil variant)
**Talab qilinadi:** B-37
**Bajarish.** Kompakt karta: avatar, ism + tasdiqlangan belgisi, kategoriya,
platforma ikonalari, followers, ER, o'sish. Bosilganda haptic + profilga o'tish.
**DoD.** 360px ekranda ham chiroyli ko'rinadi.

### - [ ] STEP-M-09 — Bosh sahifa (Dashboard)
**Talab qilinadi:** B-39
**Bajarish.** `GET /app/dashboard` — gorizontal scroll bloklar:
tavsiya etilgan, eng mashhur, trending, tez o'sayotgan, yangi.
Yuqorida qidiruv maydoni va kategoriya plitalari.
**DoD.** Bitta so'rov bilan yuklanadi, skeleton ko'rsatiladi.

### - [ ] STEP-M-10 — Kategoriyalar
**Talab qilinadi:** B-21
**Bajarish.** Kategoriya ro'yxati (emoji + nom + influencer soni),
bosilganda subkategoriyalar, keyin katalog.
**DoD.** Ikki darajali navigatsiya ishlaydi.

### - [ ] STEP-M-11 — Katalog va cheksiz scroll
**Talab qilinadi:** B-37
**Bajarish.** `useInfiniteQuery`, 20 tadan yuklash, pastga yetganda avtomatik,
tartiblash tanlagichi (Sheet ichida).
**DoD.** 100+ natijada ham silliq scroll.

### - [ ] STEP-M-12 — Filter paneli (Sheet + MainButton)
**Talab qilinadi:** B-37
**Bajarish.**
1. Pastdan chiquvchi `Sheet`, `GET /app/influencers/filters` dan dinamik
2. Kategoriya, platforma, followers diapazoni, ER (min), davlat/shahar, tier, tasdiqlangan
3. **`MainButton`** = "Natijalarni ko'rsatish (42)" — real vaqtda son yangilanadi
4. "Tozalash" tugmasi, qo'llanilgan filterlar chip sifatida katalogda
5. Filter holati URL hash'da (`#/catalog?followers=100000-500000`)
**DoD.** MainButton bosilganda Sheet yopiladi va natijalar yangilanadi.

### - [ ] STEP-M-13 — Qidiruv
**Bajarish.** Alohida qidiruv ekrani, `suggest` bilan 250ms debounce,
oxirgi qidiruvlar (localStorage), natija bosilganda profilga.
**DoD.** Yozganda takliflar chiqadi.

### - [ ] STEP-M-14 — Influencer profili
**Talab qilinadi:** B-38
**Bajarish.**
1. Hero: cover, avatar, ism, tasdiqlangan, kategoriyalar, shahar, bio (ko'proq/kamroq)
2. Umumiy ko'rsatkichlar qatori
3. Ijtimoiy tarmoqlar — tab yoki akkordeon, har biri uchun to'liq statistika
4. Narxlar jadvali
5. Aloqa tugmalari (Telegram'ga o'tish — `openTelegramLink`)
6. `MainButton` = "Ulashish"
**DoD.** Barcha ma'lumot ko'rinadi, tashqi havolalar `openLink` orqali ochiladi.

---

## FAZA 2 — Interaktiv funksiyalar (M-15 … M-20)

### - [ ] STEP-M-15 — O'sish grafigi
**Talab qilinadi:** B-29
**Bajarish.** `recharts` — **faqat `lazy` import** (bundle uchun).
Davr tanlagich (30d/90d/1y), metrika tanlagich. Ma'lumot yo'q bo'lsa — bo'sh holat.
**DoD.** Grafik yuklanadi va boshlang'ich bundle hajmi oshmaydi.

### - [ ] STEP-M-16 — Favorites
**Talab qilinadi:** B-40
**Bajarish.** Yurak tugmasi (optimistik + haptic), `/favorites` ekrani,
telefon tasdiqlanmagan bo'lsa — `requestContact` so'rovi.
**DoD.** Saqlangan influencerlar ro'yxati ishlaydi.

### - [ ] STEP-M-17 — Taqqoslash
**Talab qilinadi:** B-41
**Bajarish.** Kartadan "taqqoslashga qo'shish", pastdagi suzuvchi indikator (2/4),
`/compare` ekrani — gorizontal scroll jadval, eng yaxshi qiymat ajratilgan.
**DoD.** 2–4 influencer taqqoslanadi.

### - [ ] STEP-M-18 — Telegram'ga ulashish
**Talab qilinadi:** B-49
**Bajarish.** `GET /app/share/influencer/:slug` -> `shareURL()` yoki
`openTelegramLink(shareUrl)`. Do'stga yoki guruhga yuborish.
**DoD.** Telegram'da ulashish oynasi ochiladi, havola Mini App'ni to'g'ri sahifada ochadi.

### - [ ] STEP-M-19 — Profil ekrani
**Bajarish.** Foydalanuvchi ma'lumoti (Telegram'dan), til tanlash,
joriy tarif, telefon bog'lash (agar bog'lanmagan bo'lsa), statistika (saqlanganlar soni).
**DoD.** Til o'zgarsa butun ilova tili almashadi.

### - [ ] STEP-M-20 — i18n (uz / ru)
**Bajarish.** Yengil yechim (`react-i18next` yoki oddiy kontekst),
boshlang'ich til Telegram `languageCode` dan, o'zgartirish mumkin.
**DoD.** Ikkala til to'liq ishlaydi.

---

## FAZA 3 — Sifat va deploy (M-21 … M-24)

### - [ ] STEP-M-21 — Xatolik va yuklanish holatlari
**Bajarish.** `ErrorBoundary`, tarmoq yo'q holati, `ApiError.code` bo'yicha xabarlar,
barcha ro'yxatlar uchun skeleton, bo'sh holatlar (illustratsiya + taklif).
**DoD.** Backend o'chirilganda ilova oq ekran bermaydi.

### - [ ] STEP-M-22 — Performance
**Bajarish.**
1. `rollup-plugin-visualizer` bilan bundle tahlili
2. Sahifalar `React.lazy` bilan bo'linadi
3. Rasm `thumb` varianti + `loading="lazy"`
4. `useInfiniteQuery` da eski sahifalar DOM'dan olinadi
**DoD.** Boshlang'ich JS < 200KB gzip, 3G'da ochilish < 3s.

### - [ ] STEP-M-23 — Telegram nozikliklari
**Bajarish.**
1. `closingConfirmation` — filter to'ldirilgan yoki taqqoslash bo'sh emas holatda
2. iOS safe area, klaviatura ochilganda viewport o'zgarishi
3. `platform` bo'yicha farqlar (ios / android / tdesktop)
4. `HapticFeedback` barcha muhim amallarda
5. Scroll pozitsiyasi orqaga qaytganda saqlanadi
**DoD.** iOS va Android Telegram'da bir xil to'g'ri ishlaydi.

### - [ ] STEP-M-24 — Deploy
**Bajarish.** Statik build (`dist/`) -> nginx/CDN, HTTPS majburiy,
BotFather'da `/newapp` yoki `/setmenubutton` bilan URL sozlanadi,
GitHub Actions (typecheck -> build -> deploy).
**DoD.** Bot menyusidan Mini App ochiladi va to'liq ishlaydi.
