# 06 — Telegram Mini App (`influencer-miniapp`)

> Holat: M-01…M-24 tugagan. Native elementlar (BackButton/MainButton/haptics/closingConfirmation), lazy sahifalar,
> ~133KB gzip, mock initData — yaxshi. Quyida: performance (P1), Telegram imkoniyatlari (P2), sifat.

---

## 1. Filter varag'ida ikki marta qidiruv (P1)

`useInfluencerCount` — har filter o'zgarishida `search` (perPage=1) faqat `totalItems` uchun, keyin "Ko'rsatish" → to'liq `search`.
**Yechim.** 400 ms debounce (bor bo'lsa tekshiring) + backend `count` keshi (`02-BACKEND-PERFORMANCE` §2) yoki `POST /app/influencers/count`.
Tarmoq sekin bo'lsa MainButton matni `…` (loading) — bor.

---

## 2. Rasm: `thumbUrl` variant fallback (P2)

`helpers/image.ts` `.thumb.webp` ga almashtiradi; variant hali tayyor bo'lmasa (`ImageProcessor` fonda) `<img onError>` originalga qaytishi kerak — `Avatar` da bormi tekshiring; yo'q bo'lsa `onError={() => setSrc(original)}`.
Backend `File.variants` tayyor bo'lguncha `avatarUrl` originalni beradi — karta ro'yxatida 20 ta original (100–500KB) → LCP. Yechim: `InfluencerCardDto.avatarThumbUrl` (backend `File.variants.thumb` dan, bo'lmasa original) — web ham foydalanadi.

---

## 3. Telegram imkoniyatlari (P2)

| Imkoniyat | Nima uchun | Qanday |
|---|---|---|
| **CloudStorage** (`cloudStorage.setItem`) | Til va oxirgi filterlar qurilmalar aro saqlanadi (sessionStorage har ochilishda yo'qoladi) | `services/telegram/cloud.ts`: `lang`, `lastFilters`, `compareIds` |
| **`startapp` kengaytmasi** | Hozir `inf_<slug>`; qo'shish: `cat_<slug>` (kategoriya), `q_<query>`, `cmp_<id1>-<id2>` (taqqoslash ulashish) | `useStartParamRedirect` |
| **Share card rasmi** | `t.me/share/url` matn — rasm bilan CTR yuqori | Backend `GET /app/share/influencer/:slug/card.png` (sharp + SVG template: avatar, ism, followers, ER) — Telegram preview oladi |
| **`requestWriteAccess`** | Bot foydalanuvchiga yozishi uchun (alertlar, `09-FEATURE-IDEAS` §5) | Sozlamalarda "Bildirishnomalar" toggle → `requestWriteAccess()` |
| **SettingsButton** | Profil/til/bildirishnoma — native tugma | `settingsButton.mount()` → `/profile` |
| **Biometric/`initData` yangilash** | initData 5 daqiqa; ilova uzoq ochiq — refresh token bilan ishlaydi (OK) | `AuthGate`: refresh ham yiqilsa `init` qayta (bor) |
| **Home screen shortcut** (`addToHomeScreen`) | Qayta kirish | Profil ekranida taklif (bir marta) |

---

## 4. Sifat (P2)

- `TelegramGate` brauzerda mock'siz "Telegram'da oching" — OK; web link fallback: `https://t.me/<bot>/app?startapp=…` tugmasi (ulashilgan link brauzerda ochilsa).
- `AuthGate`: `init.isError && !hasToken` → error; `FORBIDDEN` (bloklangan) uchun alohida ekran matni bor — OK.
- `HashRouter` — Telegram uchun to'g'ri; `useScrollRestore` bor.
- Xotira: `useInfiniteQuery maxPages: 5` — OK.
- Testlar yo'q: `vitest` — `filters.ts` (URL ↔ DTO), `format.ts`, `i18n t()`; Playwright mock initData bilan smoke.
- `docs/AGENTS.md`: `react-router-dom` deyilgan — kodda `react-router` v8; `src/shared/api/schema.d.ts` → aslida `src/common/api-schema.d.ts` → yangilash.
- Bundle: `recharts` lazy (`ChartInner`) — OK; `axios` (~14KB gzip) o'rniga `fetch` o'rami (web'dagi `apiFetch` kabi) — miniapp uchun tejam (P3).

---

## 5. Offline/tezlik (P3)

- Service worker (Vite PWA plugin) — statik assetlar + oxirgi dashboard javobi (stale) — Telegram in-app brauzerida SW ishlaydi (iOS'da cheklangan).
- `dashboard` javobi (`~30–60KB`) → `staleTime` 5 daqiqa (hozir 1 daqiqa) — backend keshi 10 daqiqa.

---

## Qarorlar (taklif)

- `InfluencerCardDto.avatarThumbUrl` kontraktga qo'shiladi (web + miniapp).
- Share card endpoint `card.png` (backend `sharp`).
