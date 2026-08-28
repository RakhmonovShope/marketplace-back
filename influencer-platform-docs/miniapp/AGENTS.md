# AGENTS.md — influencer-miniapp (Telegram Mini App)

> Ish boshlashdan oldin `docs/00-CONTEXT-AND-DECISIONS.md` (ayniqsa **ADR-004**),
> `docs/01-ARCHITECTURE.md` §3 va `docs/03-API-CONTRACT.md` o'qilishi shart.

## Stack

- **Vite 6** + **React 19** + TypeScript strict
- **@telegram-apps/sdk-react** (rasmiy SDK)
- Tailwind CSS 4 — Telegram mavzu o'zgaruvchilari bilan
- TanStack Query v5
- `react-router-dom` (hash router — Telegram uchun xavfsizroq)
- `openapi-typescript` — tiplar generatsiya qilinadi
- Paket menejeri: **pnpm**

## Buyruqlar

```bash
pnpm dev                 # localhost:3002
pnpm build && pnpm preview
pnpm typecheck
pnpm api:gen             # openapi-typescript .../miniapp-json -o src/shared/api/schema.d.ts
pnpm tunnel              # cloudflared/ngrok — Telegram HTTPS talab qiladi
```

## Papka strukturasi (ticket-core andazasi — admin bilan bir xil pattern)

```
src/
  main.tsx, App.tsx, config.ts
  assets/styles/            # Tailwind + tg-theme o'zgaruvchilari
  common/
    types.ts                # ListResponse, ApiError ...
    api-schema.d.ts         # openapi-typescript (miniapp-json) — QO'LDA TAHRIRLANMAYDI
  components/               # o'z yengil UI komponentlarimiz (Card, Chip, Skeleton...)
  helpers/                  # format.ts (formatCompact...), confirm...
  hooks/                    # umumiy hooklar
  layouts/                  # TelegramGate (initData auth), TabBar layout
  modules/                  # ticket-core patterni: api/types/constants/hooks[/forms]
    auth/  search/  profile/  favorite/  comparison/  dashboard/  share/
  pages/                    # sahifalar — modullardan yig'iladi
  services/
    http/                   # axios + Bearer + refresh (adminnikiga o'xshash)
    storage/                # sessionStorage o'rami
    telegram/               # SDK init, useTelegram, haptics, theme binding
  i18n/                     # uz/ru (M-20)
```

Modul patterni admin AGENTS'dagi bilan bir xil: `api.ts` (PascalCase, AxiosPromise),
`types.ts` (zod + IEntity), `constants.ts`, `hooks/`, namespaced `index.ts`.
Formalar kam (qidiruv filtri) — kerak bo'lsa o'sha render-props patterni.

## Telegram-ga xos qat'iy qoidalar

1. **Auth — faqat `initData` orqali** (ADR-004). Telefon/OTP formasi **yozilmaydi**.
   Telefon kerak bo'lsa `requestContact()` ishlatiladi.
2. **`initData` har so'rovda emas, faqat kirishda** yuboriladi. Keyin oddiy JWT.
3. **Native elementlardan foydalaniladi:**
   - `BackButton` — orqaga qaytish (o'z tugmangizni chizmang)
   - `MainButton` — asosiy amal (filterni qo'llash, taqqoslash)
   - `HapticFeedback` — har bir muhim bosishda
   - `ThemeParams` — ranglar Telegram mavzusidan olinadi
   - `viewport.expand()` — ilova ochilganda
   - `closingConfirmation` — filter to'ldirilgan holatda
4. **Telegram mavzu o'zgaruvchilari** CSS'ga bog'lanadi:
   ```css
   --tg-theme-bg-color, --tg-theme-text-color, --tg-theme-hint-color,
   --tg-theme-link-color, --tg-theme-button-color, --tg-theme-button-text-color,
   --tg-theme-secondary-bg-color
   ```
   O'z rang palitrangiz **birlamchi emas** — Telegram mavzusiga moslashadi.
5. **Bundle hajmi kritik.** Boshlang'ich JS < 200KB (gzip).
   Og'ir kutubxonalar (moment, lodash to'liq, MUI/AntD) **taqiqlanadi**.
   Grafik uchun yengil yechim (`recharts` faqat `lazy import` bilan).
6. **Hash router** — Telegram ba'zi klientlarda `history.pushState` bilan muammo qiladi.
7. `startapp` parametri o'qiladi: `inf_<slug>` -> to'g'ridan-to'g'ri profil sahifasi.

## Boshlanish ketma-ketligi

```ts
// src/shared/telegram/init.ts
init();                        // SDK
viewport.expand();
themeParams.bindCssVars();
backButton.mount();
mainButton.mount();
// initData -> POST /auth/telegram/init -> tokenlar saqlanadi
```

Telegram muhitidan tashqarida ochilsa (brauzerda) — "Bu ilovani Telegram'da oching"
ekrani ko'rsatiladi (dev rejimda mock `initData` bilan ishlash mumkin).

## Qat'iy qoidalar

1. API tiplari qo'lda yozilmaydi — `pnpm api:gen`.
2. Raqam formatlash `shared/lib/format.ts` da (web bilan bir xil mantiq).
3. Xatolar `code` bo'yicha ushlanadi.
4. Sahifa o'tishlarida `HapticFeedback.impactOccurred('light')`.
5. Har bir ro'yxat — virtualizatsiya yoki "ko'proq yuklash" (cheksiz scroll),
   bir vaqtda 20 tadan ortiq karta DOM'da bo'lmasin.
6. Rasm — `loading="lazy"`, `thumb` varianti (`variants.thumb`).

## Nima qilinmaydi

- SSR (kerak emas)
- Og'ir UI kutubxonalari
- O'z BackButton/MainButton'ini chizish
- Telefon + OTP formasi (ADR-004 buzilishi)
