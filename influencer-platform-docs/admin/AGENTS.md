# AGENTS.md — influencer-admin

> Ish boshlashdan oldin `docs/00-CONTEXT-AND-DECISIONS.md` (ayniqsa **ADR-005**),
> `docs/03-API-CONTRACT.md` §4 va §5 o'qilishi shart.

## Stack

- **Vite 6** + **React 19** + TypeScript strict
- **Ant Design 5** (Table, Form, Upload, DatePicker — tayyor komponentlar)
- **TanStack Query v5**
- `react-router-dom` v7
- `openapi-typescript` — tiplar generatsiya qilinadi
- `@ant-design/plots` yoki Recharts — grafiklar
- Paket menejeri: **pnpm**

## Buyruqlar

```bash
pnpm dev                 # localhost:3003
pnpm build && pnpm preview
pnpm typecheck
pnpm api:gen             # openapi-typescript .../admin-json -o src/shared/api/schema.d.ts
```

## Papka strukturasi

```
src/
  app/          { App.tsx, router.tsx, providers.tsx, layout/ }
  pages/
    dashboard/
    influencers/    { list, form, detail/{profile,socials,stats,prices,analytics} }
    categories/
    users/
    admins/  roles/
    imports/
    sync/
    references/     { countries, cities, languages }
    plans/  featured/  banners/  pages/  settings/
    login/
  features/
    auth/  crud/  filters/
  shared/
    api/        { client.ts, schema.d.ts, query-keys.ts }
    ui/         { CrudTable, FilterBar, FormDrawer, ImageUpload, StatCard, ... }
    lib/        { format.ts, permissions.ts }
```

## Asosiy naqsh: universal CRUD

Backend barcha resurslarda bir xil kontraktga ega (`03-API-CONTRACT.md` §4.1),
shuning uchun **bitta `CrudTable` komponenti** yoziladi va har bir resurs
faqat konfiguratsiya beradi:

```ts
<CrudTable
  resource="influencers"
  columns={influencerColumns}
  filters={influencerFilters}
  permissions={{ view: 'INFLUENCER__VIEW', create: 'INFLUENCER__CREATE', ... }}
  form={InfluencerForm}
/>
```

Har bir resurs uchun jadval va formani noldan yozish **taqiqlanadi**.

## Qat'iy qoidalar

1. **Permission bo'yicha UI**: `usePermission('INFLUENCER__CREATE')` — ruxsat bo'lmasa
   tugma **ko'rsatilmaydi** (faqat `disabled` emas). Menyu ham shunga qarab quriladi.
2. **API tiplari qo'lda yozilmaydi** — `pnpm api:gen`.
3. **Hisoblanadigan maydonlar formada bo'lmaydi**: `engagementRate`, `viewRate`,
   `growth*`, `popularityScore`, `tier` — bularni backend hisoblaydi, admin kiritmaydi
   (faqat `followers`, `avgLikes`, `avgComments`, `avgViews`, `postsCount` kiritiladi).
4. **`manualLock` aniq ko'rsatiladi**: qulflangan maydon yonida qulf ikonasi va
   "Bu qiymat avtomatik yangilanmaydi" tooltip'i (ADR-005).
5. **Import faqat ikki bosqichli**: yuklash -> preview -> tasdiqlash.
   "Yuklab darhol yozish" tugmasi bo'lmaydi.
6. Xatolar `code` bo'yicha ushlanadi; validatsiya xatolari (`details`) forma
   maydonlariga taqsimlanadi.
7. Barcha ro'yxatlar server tomonda sahifalanadi va filtrlanadi
   (`POST /admin/<resource>/search`) — frontendda `filter()` qilinmaydi.
8. Matnlar uz/ru — forma har ikkala tilni yonma-yon ko'rsatadi (tab emas, ikki ustun).

## Nima qilinmaydi

- Client-side sahifalash yoki filtrlash
- Hisoblanadigan metrikalarni qo'lda kiritish maydonlari
- Permission tekshiruvini faqat frontendda qilish (backend ham tekshiradi, lekin
  UI'da yashirish majburiy)
- Bir bosqichli import
