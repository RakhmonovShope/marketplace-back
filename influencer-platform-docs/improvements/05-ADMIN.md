# 05 — Admin panel (`influencer-admin`, Vite + Mantine)

> Holat: A-01…A-28 tugagan (A-25 ⏸). `CrudTable` + render-prop formalar + permission UI — kuchli poydevor.
> Quyida: performance (P1), operatsion imkoniyatlar (P1), sifat (P2).

---

## 1. Bundle: barcha sahifalar statik import (P1)

`App.tsx` — 16 sahifa, `recharts`, `mantine-datatable`, `@mantine/charts` bitta chunk'da. Yechim: `lazy(() => import('@/pages/...'))` + `Suspense`
(login va layout statik). Vite `manualChunks`: `mantine`, `charts`, `datatable`. Natija: birinchi yuklash ~2–3× kichik. `ANALYZE` (rollup-plugin-visualizer, miniapp'dagidek) qo'shish.

---

## 2. Ommaviy amallar: N ta so'rov (P1)

`pages/influencers/index.tsx`: bulk publish → `selected.forEach(publish.mutate)`; kategoriya qo'shish va sinxronizatsiya — `for ... await` (100 ta influencer = 100–300 so'rov, qisman xato bo'lsa holat noaniq).
**Backend:** `POST /admin/influencers/bulk` `{ ids, action: 'publish'|'archive'|'restore'|'verify'|'addCategory'|'sync', payload? }` → `{ ok: n, failed: [{id, code, message}] }` (transaction per item, natija ro'yxati).
**Admin:** bitta mutation, progress/natija modal ("97 ta OK, 3 ta xato: …").

---

## 3. Ma'lumot sifati paneli (P1) — `03-DATA-QUALITY` §4

Dashboard'ga "Sifat" bloki + `/data-quality` sahifasi: kartalar (NEVER sync, eskirgan stats > 30 kun, avatar/kategoriya/narx yo'q, shubhali auditoriya, dublikat username, FAILED sync sabablari). Har karta → `CrudTable` mos DSL filter bilan (`statsUpdatedAt lte`, `deletedAt isNull` — allaqachon `INFLUENCER_ADMIN_FILTERABLE` da).

---

## 4. Jadval imkoniyatlari (P1/P2)

| Imkoniyat | Hozir | Taklif |
|---|---|---|
| Sahifa hajmi | `PER_PAGE = 20` qat'iy | 20/50/100 tanlovi (URL `?perPage=`) |
| Eksport | yo'q | `GET /admin/<resource>/export?format=csv` (server tomonida streaming, filter/sort URL'dan) — influencer, user, sync accounts |
| Ustunlar | qat'iy | ustun ko'rsatish/yashirish (localStorage `inf-admin:columns:<table>`) |
| Saqlangan filterlar | yo'q | "Mening ko'rinishlarim" (localStorage) — masalan "Nashr qilinmagan + Food" |
| Satr detali | navigate | `Drawer` preview (klaviatura ↑↓) — tez tekshiruv uchun |
| Sana filtri | yo'q (DSL `between` bor) | `createdAt`/`statsUpdatedAt` uchun `DatePickerInput` toolbar'da |

---

## 5. Influencer detal sahifasi (P2)

- **Tarixni yuklash** tugmasi (STATS import `measuredAt` bilan) — akkaunt tabida.
- **Audit tarixi**: kim, qachon, nimani o'zgartirdi (`09-FEATURE-IDEAS` admin §; backend `AuditLog`).
- **Preview**: "Web'da ko'rish" havolasi (published bo'lsa) + Mini App deep link (`t.me/<bot>/app?startapp=inf_<slug>`).
- Stats formasi: `lockFields` tushuntirish (qulf ikonasi bor); `measuredAt` o'tmish bo'lsa "backfill" ogohlantirishi.
- Narxlar: `negotiable` va `noteUz/Ru` — bor; "narx per 1k followers" hisoblangan ustun (benchmark bilan taqqoslash).

---

## 6. Sifat va texnik qarz (P2)

- `zustand`, `radash` — ishlatilmaydi (0 import) → olib tashlash. `docs/AGENTS.md` "Zustand — auth store" va `services/i18n` (A-27) — kodda yo'q → hujjatni yangilash.
- Tokenlar `localStorage` da — admin SPA uchun maqbul; XSS himoyasi: Mantine `dangerouslySetInnerHTML` yo'q, `Page.contentUz/Ru` (HTML?) — agar sahifalar HTML bo'lsa admin preview'da sanitizatsiya (`DOMPurify`).
- `ProtectedRoute`: token bor + `me` xato → `/login`; `me.isError` 5xx (backend tushgan) ham login'ga otadi → 5xx da "server xatosi, qayta urinish" ekrani.
- `useQueryParams` — `filters` URL'da emas (faqat page/q/sort) → `status/categoryId/tier` sahifa yangilanganda yo'qoladi; URL'ga qo'shish (`?status=PUBLISHED&categoryId=…`).
- `CrudTable` `PER_PAGE` bilan `perPage` server `PAGE_SIZE` ni override qiladi — OK.
- ESLint 10 + oxlint — ikkala linter; `pnpm lint` faqat eslint → oxlint'ni CI'ga ham.
- Testlar yo'q: `vitest` + `@testing-library/react` — `CrudTable` (sort/page URL sinxroni), `applyServerErrors`, `usePermission`; Playwright smoke (login → influencer yaratish → publish) staging'ga qarshi (`08-TESTING`).

---

## 7. UX mayda

- Kirish sahifasida "parolni unutdim" yo'q — admin uchun super-admin qayta o'rnatadi (Adminlar → "parolni tiklash" tugmasi: backend `POST /admin/admins/:id/reset-password` → vaqtinchalik parol).
- Til: interfeys faqat o'zbekcha — jamoa ruscha bo'lsa `i18n` (A-27 rejalashtirilgan edi) — P3.
- Dashboard `usersChart` — `@mantine/charts` (recharts) OK; "so'nggi 7 kun" toggle.
- Notifications: xato `message` backend'dan (o'zbekcha) — OK; `code` bo'yicha maxsus matnlar (`QUOTA_EXCEEDED`, `MANUAL_LOCK_CONFLICT`).

---

## Qarorlar (taklif)

- Bulk endpoint kontrakti `{ ids, action, payload }` → `{ ok, failed[] }` (`03-API-CONTRACT` §4.3 ga qo'shiladi).
