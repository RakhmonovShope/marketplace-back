# ROADMAP — influencer-admin

> Bir vaqtda 1 ta qadam. Har qadamdan keyin `pnpm typecheck && pnpm build`.
> Backend `B-17` tugagach ishni boshlash mumkin.

---

## FAZA 0 — Skelet (A-01 … A-06)

### - [ ] STEP-A-01 — Loyiha skeleti
**Bajarish.**
1. `pnpm create vite influencer-admin --template react-ts`, port 3003
2. `strict: true`, `paths: { "@/*": ["./src/*"] }`, Prettier, ESLint
3. `pnpm add antd @ant-design/icons @tanstack/react-query react-router-dom`
4. `docs/` va `CLAUDE.md`
**DoD.** `pnpm build` xatosiz.

### - [ ] STEP-A-02 — API klient va tiplar
**Talab qilinadi:** B-05
**Bajarish.** `api:gen` skripti, `apiFetch` (`X-Client: admin`), `ApiError`,
`query-keys.ts`, TanStack Query provayderi.
**DoD.** `pnpm api:gen` ishlaydi.

### - [ ] STEP-A-03 — Kirish va sessiya
**Talab qilinadi:** B-11
**Bajarish.**
1. `/login` — email + parol formasi
2. Tokenlar `localStorage`; 401 da avtomatik refresh (mutex bilan), muvaffaqiyatsiz -> `/login`
3. `GET /auth/me` -> `user`, `permissions` kontekstga
4. `INVALID_CREDENTIALS` uchun aniq xabar
**DoD.** Seed super-admin bilan kirish ishlaydi, sahifa yangilanganda sessiya saqlanadi.

### - [ ] STEP-A-04 — Layout va permission asosidagi menyu
**Bajarish.**
1. AntD `Layout`: yon menyu (yig'iladigan), header (foydalanuvchi, chiqish, til)
2. Menyu elementlari `permissions` bo'yicha filtrlanadi
3. `ProtectedRoute` — ruxsat yo'q bo'lsa 403 sahifasi
4. `usePermission(code)` hook
**DoD.** Cheklangan rolli admin faqat o'ziga ruxsat berilgan bo'limlarni ko'radi.

### - [ ] STEP-A-05 — `CrudTable` universal komponenti ⚠️ kritik
**Talab qilinadi:** B-18
**Bajarish.**
1. `POST /admin/<resource>/search` bilan server tomonda sahifalash/tartiblash
2. Ustun konfiguratsiyasi, qidiruv maydoni, filter paneli
3. Amallar ustuni: ko'rish / tahrirlash / o'chirish / tiklash — permission bo'yicha
4. Ommaviy amallar (checkbox), `Popconfirm` bilan tasdiqlash
5. URL bilan sinxron holat (`?page=2&sort=createdAt:desc`)
6. Bo'sh holat va yuklanish skeletoni
**DoD.** Bitta komponent bilan istalgan resurs jadvali quriladi.

### - [ ] STEP-A-06 — `FormDrawer` va umumiy forma maydonlari
**Bajarish.** Yon panel (Drawer) forma, `zod`/AntD validatsiyasi,
backend `details` xatolarini maydonlarga taqsimlash,
umumiy maydonlar: `ImageUpload` (`POST /admin/files/upload`), `LocalizedInput` (uz/ru ikki ustun),
`EntitySelect` (server qidiruvi bilan), `DecimalInput`.
**DoD.** Forma xatolari to'g'ri maydonda ko'rinadi.

---

## FAZA 1 — Boshqaruv asoslari (A-07 … A-12)

### - [ ] STEP-A-07 — Rollar va permissionlar
**Talab qilinadi:** B-16
**Bajarish.** Rol CRUD; permission tanlash — guruhlangan checkbox daraxti
(`GET /admin/roles/permissions`); `isSystem` rollar tahrirlanmaydi/o'chirilmaydi.
**DoD.** Yangi rol yaratib, permissionlar tanlanadi.

### - [ ] STEP-A-08 — Adminlar
**Talab qilinadi:** B-16
**Bajarish.** Admin CRUD, rol biriktirish, faollashtirish/o'chirish,
parolni tiklash tugmasi. Admin o'zini o'chira olmaydi.
**DoD.** Yangi admin yaratiladi va u tizimga kira oladi.

### - [ ] STEP-A-09 — Foydalanuvchilar (user management)
**Talab qilinadi:** B-17
**Bajarish.** Ro'yxat: telefon, ism, ro'yxatdan o'tgan joyi (WEB/MINIAPP), tarif,
oxirgi kirish, holat. Filterlar: sana, manba, holat, tarif.
Detal: profil + faollik (saqlanganlar, qidiruvlar soni).
Bloklash/blokdan chiqarish (sabab bilan).
**DoD.** Bloklangan foydalanuvchi ilovaga kira olmaydi.

### - [ ] STEP-A-10 — Ma'lumotnomalar
**Talab qilinadi:** B-20
**Bajarish.** Country / City / Language uchun `CrudTable` (uz/ru maydonlar, tartib).
**DoD.** Uchala resurs ham ishlaydi.

### - [ ] STEP-A-11 — Kategoriyalar (daraxt)
**Talab qilinadi:** B-21
**Bajarish.** AntD `Tree` yoki daraxtli jadval, drag&drop bilan tartib
(`PUT /admin/categories/reorder`), forma: uz/ru nom, tavsif, slug, emoji, cover,
`isPopular`. O'chirishda bog'liqlik xatosi (`409`) tushunarli ko'rsatiladi.
**DoD.** Ikki darajali daraxt ko'rinadi va tartibi o'zgartiriladi.

### - [ ] STEP-A-12 — Admin dashboard
**Talab qilinadi:** B-50
**Bajarish.** `GET /admin/dashboard`: hisoblagich kartalari, sinxronizatsiya salomatligi
(SUCCESS/FAILED/NEVER — bosilganda mos filtrlangan ro'yxatga o'tadi),
foydalanuvchilar grafigi, oxirgi importlar, eng ko'p ko'rilgan influencerlar.
**DoD.** Bosh sahifa bitta so'rov bilan yuklanadi.

---

## FAZA 2 — Influencer boshqaruvi (A-13 … A-19)

### - [ ] STEP-A-13 — Influencerlar ro'yxati
**Talab qilinadi:** B-22
**Bajarish.** `CrudTable`: avatar, ism, kategoriya, holat (`DRAFT/PUBLISHED/...`),
tasdiqlangan, jami followers, ER, o'sish, sinxronizatsiya holati, yangilangan vaqti.
Filterlar: holat, kategoriya, davlat/shahar, tier, tasdiqlangan, sync holati, followers diapazoni.
Ommaviy amallar: nashr qilish, arxivlash.
**DoD.** Filterlar va tartiblash server tomonda ishlaydi.

### - [ ] STEP-A-14 — Influencer yaratish/tahrirlash formasi
**Talab qilinadi:** B-22, B-23
**Bajarish.** To'liq sahifa formasi (Drawer emas — maydon ko'p):
asosiy ma'lumotlar, avatar/cover yuklash, bio uz/ru, jins, tug'ilgan yil,
davlat/shahar, tillar, kategoriyalar (`isPrimary` tanlash bilan), aloqa ma'lumotlari.
Slug avtomatik, lekin qo'lda o'zgartirish mumkin.
**DoD.** Influencer yaratiladi va tahrirlanadi.

### - [ ] STEP-A-15 — Influencer detal sahifasi (tablar)
**Bajarish.** Tablar: **Profil**, **Ijtimoiy tarmoqlar**, **Statistika**,
**Narxlar**, **Analytics**, **Sinxronizatsiya tarixi**.
Yuqorida: holat belgisi, "Nashr qilish", "Tasdiqlash", "Qayta hisoblash" tugmalari.
**DoD.** Barcha tablar ishlaydi.

### - [ ] STEP-A-16 — Ijtimoiy tarmoqlar boshqaruvi
**Talab qilinadi:** B-24
**Bajarish.** Akkaunt qo'shish/tahrirlash (platforma, username, URL, `isPrimary`),
dublikat xatosi (`409 DUPLICATE_SOCIAL_ACCOUNT`) tushunarli ko'rsatiladi,
har bir akkaunt kartasida: joriy statistika, `dataSource`, `syncStatus`,
`lastSyncedAt`, "Sinxronlash" tugmasi.
**DoD.** Akkaunt qo'shiladi va statistika ko'rinadi.

### - [ ] STEP-A-17 — Statistikani qo'lda kiritish (ADR-005) ⚠️ kritik
**Talab qilinadi:** B-27
**Bajarish.**
1. Forma faqat **kiritiladigan** maydonlar bilan: `followers`, `avgLikes`,
   `avgComments`, `avgViews`, `postsCount`, `measuredAt`
2. Hisoblanadigan maydonlar (`ER`, `viewRate`, `growth`) — faqat **ko'rsatiladi**,
   tahrirlanmaydi (kulrang, tooltip: "Avtomatik hisoblanadi")
3. `lockFields` checkbox: "Bu qiymatlarni avtomatik yangilanishdan himoyalash"
4. Qulflangan maydonlar yonida qulf ikonasi
5. Saqlangach — yangi statistika va snapshot darhol ko'rinadi
**DoD.** Qo'lda kiritilgan qiymat `manualLock` bilan himoyalanadi va sinxronizatsiya uni o'zgartirmaydi.

### - [ ] STEP-A-18 — Analytics va o'sish grafigi
**Talab qilinadi:** B-28, B-29
**Bajarish.** Har bir akkaunt uchun grafik (davr tanlagich), metrikalar jadvali,
snapshot tarixi jadvali (qo'lda nuqta qo'shish imkoniyati),
"Ma'lumot oxirgi yangilangan" ko'rsatkichi.
**DoD.** Grafik va tarix ko'rinadi.

### - [ ] STEP-A-19 — Narxlar
**Talab qilinadi:** B-25
**Bajarish.** Platforma x format matritsasi ko'rinishida tahrirlash,
valyuta tanlash, "Kelishiladi" belgisi. Bulk saqlash.
**DoD.** Narxlar saqlanadi, `minPrice` yangilanadi.

---

## FAZA 3 — Ma'lumot yig'ish (A-20 … A-23)

### - [ ] STEP-A-20 — Sinxronizatsiya boshqaruvi
**Talab qilinadi:** B-35
**Bajarish.**
1. `/sync` sahifasi: umumiy holat (`GET /admin/sync/status`) — SUCCESS/FAILED/NEVER kartalari
2. Xato bo'lgan akkauntlar ro'yxati + xato matni + "Qayta urinish"
3. "Hammasini sinxronlash" tugmasi (tasdiq bilan)
4. Har bir akkaunt uchun sinxronizatsiya tarixi (`SyncLog`): vaqt, davomiylik,
   o'zgargan maydonlar, xato
5. Provayder mavjud emasligi holati aniq ko'rsatiladi ("API kaliti sozlanmagan")
**DoD.** Admin qaysi akkauntlar yangilanmayotganini bir qarashda ko'radi.

### - [ ] STEP-A-21 — Import: yuklash va preview ⚠️ kritik
**Talab qilinadi:** B-36
**Bajarish.**
1. `/imports` sahifasi: tur tanlash (INFLUENCER / SOCIAL_ACCOUNT / STATS)
2. "Namuna faylni yuklab olish" tugmasi
3. Drag&drop fayl yuklash (CSV/XLSX), progress
4. Validatsiya tugagach: preview jadvali (`create`/`update` belgisi bilan),
   xatolar jadvali (qator, maydon, xabar), umumiy hisobot (jami / to'g'ri / xato)
5. Xato bo'lsa "Tasdiqlash" tugmasi **bloklanadi** yoki "faqat to'g'ri qatorlarni yozish"
   varianti taklif qilinadi
**DoD.** Xato faylda import qo'llanmaydi; to'g'ri faylda preview aniq ko'rinadi.

### - [ ] STEP-A-22 — Import: tasdiqlash va tarix
**Bajarish.** "Tasdiqlash va yozish" -> progress (polling `GET /admin/imports/:id`),
yakuniy hisobot (yaratilgan / yangilangan / xato), importlar tarixi jadvali,
xatolar hisobotini CSV qilib yuklab olish.
**DoD.** 100 qatorli fayl to'liq import bo'ladi va hisobot ko'rinadi.

### - [ ] STEP-A-23 — Ommaviy amallar
**Bajarish.** Tanlangan influencerlarni ommaviy nashr qilish, arxivlash,
kategoriya biriktirish, sinxronizatsiyaga qo'yish.
**DoD.** Ommaviy amal tasdiq bilan ishlaydi.

---

## FAZA 4 — Kontent va yakun (A-24 … A-28)

### - [ ] STEP-A-24 — Tariflar
**Talab qilinadi:** B-44
**Bajarish.** Plan ro'yxati va limitlarni tahrirlash formasi
(`searchesPerDay`, `canSeeFullAnalytics`, ...). `FEATURE_GATING_ENABLED` holati
ogohlantirish sifatida ko'rsatiladi ("Cheklovlar hozir o'chirilgan").
**DoD.** Limitlar tahrirlanadi.

### - [ ] STEP-A-25 — Featured placement
**Talab qilinadi:** B-47
**Bajarish.** Joylashtirish CRUD: influencer, tur, kategoriya, davr, pozitsiya, narx.
Kalendar ko'rinishida aktiv joylashtirishlar.
**DoD.** Featured influencer katalogda yuqorida chiqadi.

### - [ ] STEP-A-26 — Bannerlar, sahifalar, sozlamalar
**Talab qilinadi:** B-48
**Bajarish.** Banner CRUD (uz/ru rasm, joylashuv, davr),
Page CRUD (rich text muharrir — `@tiptap` yoki oddiy markdown),
Setting: `popularityScore` koeffitsientlari va boshqa sozlamalar (guruhlangan).
**DoD.** Sozlama o'zgarsa backend keyingi hisoblashda ishlatadi.

### - [ ] STEP-A-27 — Sifat: xatolar, i18n, UX
**Bajarish.** Global `ErrorBoundary`, `ApiError.code` bo'yicha xabarlar,
saqlanmagan o'zgarishlarda ogohlantirish, klaviatura qisqartmalari (saqlash),
interfeys tili uz/ru.
**DoD.** Xatoliklar tushunarli, ma'lumot yo'qolmaydi.

### - [ ] STEP-A-28 — Deploy
**Bajarish.** Statik build -> nginx (`admin.<domain>`), env (`VITE_API_URL`),
GitHub Actions (typecheck -> build -> deploy), basic auth yoki IP cheklovi (ixtiyoriy).
**DoD.** Prod'da admin panel ishlaydi.
