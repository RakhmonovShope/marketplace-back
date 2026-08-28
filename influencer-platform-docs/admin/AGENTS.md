# AGENTS.md — influencer-admin

> Ish boshlashdan oldin `docs/00-CONTEXT-AND-DECISIONS.md` (ayniqsa **ADR-005, v1.3**),
> `docs/03-API-CONTRACT.md` §4 va §5 o'qilishi shart.
> Struktura andazasi — `frontend-ticket-core` loyihasi patterni.

## Stack

- **Vite 6** + **React 19** + TypeScript strict
- **Mantine** (core, hooks, dates, notifications, modals) — v1.3 da AntD o'rniga
  tanlangan: boy komponentlar, lekin runtime CSS-in-JS yo'q (native CSS)
- **mantine-datatable** — server-side jadval
- **react-hook-form + zod** (`@hookform/resolvers/zod`) — barcha formalar
- **TanStack Query v5** — server holati
- **Zustand** — lokal global holat (auth store)
- **axios + axios-auth-refresh** — HTTP (`services/http`)
- **react-router v7**, **dayjs**, **clsx**, **radash**
- `openapi-typescript` — API tiplari generatsiya qilinadi
- Paket menejeri: **pnpm**

## Buyruqlar

```bash
pnpm dev                 # localhost:3003
pnpm typecheck           # tsc -b
pnpm build               # typecheck + vite build
pnpm lint                # eslint
pnpm api:gen             # openapi-typescript .../admin-json -o src/common/api-schema.d.ts
```

## Papka strukturasi (ticket-core andazasi)

```
src/
  main.tsx, App.tsx, config.ts
  assets/               # statika, global stillar
  common/
    types.ts            # IMeta, Params, ListResponse<T> ...
    api-schema.d.ts     # openapi-typescript generatsiyasi (QO'LDA TAHRIRLANMAYDI)
  components/           # dizayn-tizim ustidagi umumiy komponentlar
    CrudTable/          # mantine-datatable asosidagi universal jadval (A-05)
    FormDrawer/  LocalizedInput/  ImageUpload/  EntitySelect/  StatCard/ ...
  containers/           # sborka bloklari (Filters, PageHeader, ...)
  helpers/              # sof utilitalar (format.ts, ...)
  hooks/                # umumiy hooklar (useQueryParams, usePermission, ...)
  layouts/              # Main (AppShell), Auth, ProtectedRoute
  modules/              # domen modullari (quyida)
  pages/                # sahifalar — modullardan yig'iladi
  services/
    http/               # axios instance + interceptors + refresh
    storage/            # localStorage o'rami
    i18n/               # i18next (A-27)
```

Alias: `@/*` -> `./src/*`.

## Modul patterni (ticket-core'dan)

Har bir domen moduli `src/modules/<kebab-name>/`:

```
api.ts          # List, Single, Create, Update, Delete — PascalCase, AxiosPromise
types.ts        # zod schemalar + ICreateValues/IUpdateValues + IEntity namespace
mappers.ts      # backend javobi -> IEntity (kerak bo'lsa)
constants.ts    # query-key konstantalar (LIST, SINGLE, ...)
hooks/          # useList/useSingle/useDelete (mutationlarning delete qismi)
forms/          # Create.tsx, Update.tsx — FAQAT LOGIKA (quyida)
index.ts        # namespaced barrel: export * as Hooks/Types/Mappers/Constants/Forms
```

### Forma patterni (ticket-core, MAJBURIY)

Modul formasi = **logika-wrapper** (UI YO'Q): `FormProvider` + `useForm(zodResolver)` +
`useMutation` (invalidate + notification + `applyServerErrors`) + render-props:

```tsx
<Role.Forms.Update id={id} values={row} onSuccess={close}>
  {({ isSubmitting }) => (
    <>
      <Form />                    {/* sahifaning components/Form.tsx — faqat maydonlar */}
      <FormActions loading={isSubmitting} onCancel={close} />
    </>
  )}
</Role.Forms.Update>
```

Maydonlar — `containers/Fields` (RHF context orqali, `name` bilan):
`Fields.Input/Password/Textarea/NumberInput/Switch/Select/EntitySelect/Localized/Image`.
Sahifa `pages/<name>/components/Form.tsx` da maydonlarni yig'adi.
Domenga xos maydon (masalan `PermissionsField`) — modulning `forms/` ichida qoladi.
`FormDrawer` — faqat Drawer o'rami (`<form>` modul formasida).
Sahifada `useForm`/`useMutation`(create/update) yozish TAQIQLANADI.

Qoida: **yangi modul yozishdan oldin mavjud eng o'xshash modulni top va strukturasini ko'chir.**
Etalon: `src/modules/role/` (A-07 dan keyin).

## Backend kontrakt eslatmalari

- Admin ro'yxatlar: `POST /admin/<resource>/search` + `QueryRequestDto`
  (`{page, perPage, query?, filters[], sort[]}` — generic DSL, ADR-003)
- Xatolar: `{statusCode, code, message, details?}` — **`code` bo'yicha ushlanadi**
- Auth: access 15 daqiqa + refresh rotatsiyasi (`axios-auth-refresh` bilan 401 da)
- Statistika kiritishda hisoblanadigan maydonlar (`engagementRate`, `growth*`,
  `viewRate`, `popularityScore`, `tier`) **formada bo'lmaydi** — backend hisoblaydi
- `manualLock`/`manualFields` — qulf ikonasi bilan ko'rsatiladi (ADR-005)
- Import faqat 2 bosqichli: yuklash -> preview -> tasdiqlash

## Qat'iy qoidalar

1. **Permission bo'yicha UI**: `usePermission('X')` — ruxsat bo'lmasa element
   **ko'rsatilmaydi** (disabled emas); menyu ham shunga qarab quriladi.
2. API tiplari qo'lda yozilmaydi — `pnpm api:gen`.
3. Barcha formalar: `useForm` + `zodResolver` + Mantine `Controller`-wrapper
   komponentlari; backend `details` xatolari `setError` bilan maydonlarga taqsimlanadi.
4. Barcha ro'yxatlar server-side (`POST search`) — frontendda `filter()` yo'q.
5. Uz/Ru matn maydonlari — `LocalizedInput` (ikkala til yonma-yon).
6. Jadval holati URL'da (`useQueryParams`): `?page=2&sort=createdAt:desc`.
7. `CrudTable` bor ekan — resurs jadvalini noldan yozish taqiqlanadi.

## Nima qilinmaydi

- Client-side sahifalash/filtrlash
- Hisoblanadigan metrikalarni kiritish maydonlari
- AntD/MUI import qilish (Mantine tanlangan — v1.3)
- Bir bosqichli import
