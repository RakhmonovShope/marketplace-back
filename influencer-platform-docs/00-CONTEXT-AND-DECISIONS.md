# 00 — Loyiha konteksti va qarorlar jurnali

> **AI agent uchun:** Bu fayl — loyihaning yagona haqiqat manbai. Har qanday yangi sessiya
> ishni shu fayldan boshlaydi. Bu yerda yozilgan qarorlar **muhokama qilinmaydi**, ular
> allaqachon qabul qilingan. Yangi qaror qabul qilinsa — pastdagi ADR ro'yxatiga qo'shiladi.

---

## 1. Loyiha nima

**Influencer Discovery & Analytics Platform** — blogerlar, influencerlar va kontent
yaratuvchilarni izlash, taqqoslash va tahlil qilish platformasi.

Platforma **oddiy katalog emas**. Asosiy qiymat — ma'lumotlarga asoslangan tahlil.
Biznes uchun javob beriladigan savol:

> Yomon: "Menga bloger kerak"
> To'g'ri: "Mening biznesim uchun qaysi influencer eng samarali bo'ladi?"

Shuning uchun **Analytics (ER, o'sish, views/followers nisbati, tarixiy grafik)** —
loyihaning yadrosi, qo'shimcha funksiya emas.

### Maqsadli auditoriya
Biznes egalari, brendlar, marketing mutaxassislari, SMM va reklama agentliklari,
startaplar, e-commerce, restoranlar, kiyim brendlari, kosmetika, turizm kompaniyalari.

### Uchta mijoz ilovasi
1. **Web ilova** (Next.js) — to'liq funksional, SEO muhim
2. **Telegram Mini App** (Vite React) — web bilan deyarli bir xil funksional
3. **Admin Panel** (Vite React) — barcha ma'lumotlarni boshqarish

---

## 2. Bosqichlar

### MVP (hozirgi maqsad)
- Auth (admin: email+parol; mijoz: telefon + OTP / Telegram)
- Influencer katalogi + kategoriyalar (ierarxik)
- Kuchli qidiruv va filterlar
- Influencer profili + ijtimoiy tarmoqlar + asosiy analytics
- O'sish grafigi (snapshot tarixi asosida)
- Favorites, taqqoslash
- Dashboard (top / trending / yangi / tez o'sayotgan)
- Admin panel: Influencer CRUD, kategoriya, ijtimoiy tarmoq, analytics, user management
- Ma'lumot kiritish: **qo'lda + API sinxronizatsiya + CSV/Excel import** (uchalasi ham)

### Phase 2
Kengaytirilgan analytics, audience demographics, recommendation engine,
advanced search, avtomatik sinxronizatsiyani kengaytirish.

### Phase 3
Influencer va Business o'rtasida marketplace, reklama kampaniyalari, online to'lov,
shartnomalar, AI asosida tavsiya.

---

## 3. Qarorlar jurnali (ADR)

> Bu bo'lim 2026-08-28 dagi loyiha muhokamasi natijasida shakllangan.
> Har bir qaror: **Qaror -> Sabab -> Oqibat**.

### ADR-001 — Repo strategiyasi: 4 ta alohida repo
**Qaror.** `influencer-backend`, `influencer-web`, `influencer-miniapp`, `influencer-admin` —
har biri mustaqil repo. Backend noldan yangi repo, lekin mavjud `marketplace-backend`
infratuzilmasi ko'chiriladi.

**Sabab.** Har bir ilova mustaqil deploy qilinadi, jamoa kengaysa mustaqil ishlash oson.
Monorepo qulayligi (umumiy tiplar) Swagger'dan generatsiya orqali qoplanadi.

**Oqibat.** API tiplari har bir frontend repoda `openapi-typescript` bilan
backend Swagger JSON'idan generatsiya qilinadi (`pnpm api:gen`). Qo'lda tip yozish **taqiqlanadi**.

---

### ADR-002 — `marketplace-backend` dan nima ko'chiriladi
**Qaror.** Quyidagilar ko'chiriladi va moslashtiriladi:

| Blok | Manba |
|---|---|
| JWT auth + refresh token + strategy | `src/api/auth/` |
| RBAC: `PERMISSIONS` enum, `PermissionsGuard`, `@Permissions()` | `src/api/auth/` |
| File/Image upload + BullMQ image processor | `src/api/file/` |
| Admin va Role CRUD (user management) | `src/api/admin/`, `src/api/role/` |
| Health check (Terminus + Prisma health) | `src/api/health/` |
| Redis modul, Mail modul, Cron, Throttler | `src/common/`, `src/api/cron/` |
| `transform.interceptor.ts`, `http-exception.filter.ts`, `logging.interceptor.ts` | `src/common/` |
| Plop CRUD generator | `tools/generators/` |
| Prisma konvensiyalari (uuid id, `active`, `createdAt`/`updatedAt`, `Uz`/`Ru`) | `prisma/schema.prisma` |

**Ko'chirilmaydi:** Product, Order, Store, Car, Brand, Badge, Attribute, AttributeOption,
Message/chat gateway, Audio, marketplace Banner.

---

### ADR-003 — Pageable/filter kontrakti qayta yoziladi
**Qaror.** Eski `PaginationFilterOrderRequest` (faqat `operation: '='`) yetarli emas.
Yangi `QueryRequestDto` yoziladi: `eq, ne, gt, gte, lt, lte, in, nin, contains, between, isNull`.

**Sabab.** Loyihaning asosiy qiymati — filterlar: `followers 100K-500K`,
`ER >= 5%`, `growth > 0`, `platform in [INSTAGRAM, TELEGRAM]`. `=` bilan bu imkonsiz.

**Oqibat.** Har bir resurs uchun `FILTERABLE_FIELDS` oq ro'yxati majburiy —
foydalanuvchi ixtiyoriy maydonga filter qo'yolmasligi kerak (xavfsizlik).

---

### ADR-004 — Auth strategiyasi
**Qaror.** Uchta kirish yo'li, bitta JWT:

| Kim | Usul | Endpoint |
|---|---|---|
| **Admin** | Email + parol (bcrypt) | `POST /api/v1/auth/admin/login` |
| **Telegram Mini App** | `initData` HMAC-SHA256 validatsiya -> avtomatik kirish. Telefon raqam `requestContact()` orqali (Telegram tasdiqlagan) | `POST /api/v1/auth/telegram/init` |
| **Web** | Telefon raqam + 6 xonali OTP | `POST /api/v1/auth/web/otp/request` -> `/verify` |

**Sabab (Mini App'da OTP yo'qligi).** Telegram `initData` ni bot token bilan imzolaydi —
bu kriptografik tasdiqlangan identifikatsiya. Ustiga `requestContact()` Telegram'ning o'zi
tasdiqlagan telefon raqamni qaytaradi. SMS/email OTP bu yerda ortiqcha xarajat va ishqalanish.

**Sabab (Web'da OTP kanali).** Email O'zbekiston auditoriyasi uchun yomon ishlaydi —
spam'ga tushadi, biznes egalari kamdan-kam ochadi. Shuning uchun **OTP Telegram bot orqali
yuboriladi** — bepul, bir soniyada yetadi, spam yo'q.

**Oqibat.** `OtpChannel` abstraksiyasi majburiy:
- `TelegramOtpChannel` — **default**, bot orqali (bepul)
- `EmailOtpChannel` — zaxira (nodemailer, mavjud kod)
- `SmsOtpChannel` — Eskiz.uz / Play Mobile (keyinroq, pulli)
- `ConsoleOtpChannel` — dev rejimda konsolga chiqaradi

Kanal `OTP_CHANNEL` env o'zgaruvchisi bilan tanlanadi. Kod almashtirilmaydi.

**Muhim nozik joy — bot telefon raqamini bilmaydi.** Birinchi kirishda telefon
botga noma'lum bo'ladi, shuning uchun oqim quyidagicha:
1. `otp/request` — bu telefon uchun `User.telegramId` topilmadi -> kod yuborilmaydi,
   javobda `botDeepLink: t.me/<bot>?start=otp_<otpCodeId>` qaytadi
2. Foydalanuvchi botni ochadi -> bot `request_contact` tugmasi bilan telefonini so'raydi
3. Kontakt telefoni so'rovdagi raqamga mos kelsa -> `User` upsert (phone + telegramId
   bog'lanadi) va kod chatga yuboriladi
4. Foydalanuvchi kodni web'ga kiritadi. Keyingi kirishlarda kod darhol keladi.
(Batafsil: `01-ARCHITECTURE.md` §3.3)

---

### ADR-005 — Ma'lumot kiritishning uchta kanali (universal)
**Qaror.** Statistika **uch xil yo'l bilan** kiritiladi va uchalasi ham doimiy qo'llab-quvvatlanadi:

1. **API sinxronizatsiya** — imkoni bo'lgan platformalar uchun avtomatik (asosiy)
2. **Qo'lda kiritish** — admin panelda har qanday raqamni tahrirlash
3. **CSV / Excel import** — ommaviy yuklash

**Sabab.** Instagram/TikTok uchun rasmiy bepul API yo'q; ba'zi ma'lumotlar hech qachon
avtomatik kelmaydi; admin xatoni tuzatishi kerak bo'ladi.

**Oqibat — muhim texnik talab:** har bir statistik yozuvda `source: MANUAL | API | IMPORT`
maydoni bo'ladi. `SocialAccount.manualLock = true` bo'lsa — avtomatik sinxronizatsiya
o'sha akkauntning qo'lda kiritilgan qiymatlarini **qayta yozmaydi**. Bu qoida buzilmasligi kerak.

Provayderlar `SocialDataProvider` interfeysi orqali ulanadi (registry pattern):

| Platforma | Provayder | Holat |
|---|---|---|
| YouTube | YouTube Data API v3 (rasmiy, bepul kvota) | MVP |
| Telegram | TGStat API / Telemetr | MVP |
| Instagram | RapidAPI / Modash / HypeAuditor adapter | MVP'da adapter + stub, real kalit keyin |
| TikTok | RapidAPI adapter | Phase 2 |

---

### ADR-006 — Statistika modeli: joriy holat + tarix
**Qaror.** Statistika influencer profilidan ajratiladi va **uch qatlamda** saqlanadi:

```
Influencer  1--*  SocialAccount  1--1  SocialAccountStats     (joriy holat - tez o'qish)
                        |
                        +--*  SocialAccountSnapshot           (kunlik tarix - o'sish grafigi)
```

**Sabab.** O'sish grafigi tarixiy nuqtalarsiz imkonsiz, va tarixni orqaga qaytarib
tiklab bo'lmaydi. `SocialAccountSnapshot` MVP'da qo'lda to'ldirilsa ham, jadval
**birinchi kundan** bo'lishi shart.

**Oqibat.** `SocialAccountStats` har qanday usulda o'zgarganda — o'sha kun uchun
snapshot yoziladi (`upsert` by `[socialAccountId, capturedAt]`).

---

### ADR-007 — Denormalizatsiya (aggregate maydonlar)
**Qaror.** Katalog/filter uchun aggregat qiymatlar `Influencer` jadvalida dublikat saqlanadi:
`totalFollowers`, `maxEngagementRate`, `avgViews`, `growthRate30d`, `primaryPlatform`,
`tier`, `popularityScore`.

**Sabab.** Filter va sort join'siz, bitta jadval indeksida ishlashi kerak.
10 000+ influencer va murakkab filterlarda farq 10-50x.

**Oqibat.** `InfluencerAggregateService.recalculate(influencerId)` — statistika
o'zgargan **har qanday** joyda (qo'lda, API, import) chaqiriladi. Buni unutish =
noto'g'ri qidiruv natijalari.

---

### ADR-008 — Premium: schema bor, gating o'chirilgan
**Qaror.** `Plan`, `Subscription`, `PlanGuard`, `@RequirePlan()`, `@MaskForPlan()`
infratuzilmasi MVP'da yoziladi, lekin `FEATURE_GATING_ENABLED=false` — hamma FREE planda,
cheklovlar ishlamaydi.

**Sabab.** Keyinchalik yoqish uchun refactor kerak bo'lmaydi; to'lov integratsiyasi
MVP'ni sekinlashtirmaydi.

**Oqibat.** Analytics maydonlarini yashirish **serializer darajasida** amalga oshiriladi
(controller ichida `if` yozish taqiqlanadi).

---

### ADR-009 — Swagger uchta definition'ga bo'linadi
**Qaror.** Bitta backend, lekin Swagger UI'da "Select a definition" dropdown orqali
uchta hujjat: **Admin API**, **Web API**, **Mini App API**.

**Sabab.** Har bir frontend faqat o'ziga tegishli endpointlarni ko'rishi va faqat
o'shalardan tip generatsiya qilishi kerak.

**Oqibat.** Route prefikslari qat'iy:
- `/api/v1/admin/**` — faqat admin panel
- `/api/v1/app/**` — web va mini app uchun **umumiy**
- `/api/v1/auth/admin/**`, `/api/v1/auth/web/**`, `/api/v1/auth/telegram/**`

Hujjatlar path prefiksi bo'yicha filtrlanadi (`01-ARCHITECTURE.md` §6 ga qarang).

---

### ADR-010 — Qidiruv: MVP'da PostgreSQL
**Qaror.** MVP'da qidiruv PostgreSQL + `pg_trgm` (nomlar bo'yicha fuzzy) + to'g'ri
indekslar bilan. Meilisearch/Typesense — Phase 2.

**Sabab.** MVP'da influencerlar soni ~1 000-10 000. Postgres buni muammosiz uddalaydi.
Qo'shimcha infratuzilma erta bosqichda ortiqcha murakkablik.

**Oqibat.** `SearchService` alohida modulda — Phase 2 da faqat shu modul ichi almashadi.
Qidiruv logikasi `InfluencerService` (admin CRUD) ichiga **aralashtirilmaydi**.

---

### ADR-011 — Til: Uz / Ru
**Qaror.** Foydalanuvchiga ko'rinadigan barcha matnli maydonlar `Uz` va `Ru` suffikslari
bilan dublikatlanadi (`nameUz`, `nameRu`, `bioUz`, `bioRu`).

**Oqibat.** Faqat bitta til uchun maydon qo'shish **taqiqlanadi**.
Frontend `Accept-Language` yoki `?lang=` orqali tanlaydi.

---

### ADR-012 — Frontend stack
| Ilova | Stack | Sabab |
|---|---|---|
| Web | Next.js 15 App Router, RSC, Tailwind, shadcn/ui | Influencer profillari Google'dan organik trafik beradi -> SSR/SEO majburiy |
| Mini App | Vite + React 19 + `@telegram-apps/sdk-react` + Tailwind | Bundle hajmi va cold start kritik; SSR keraksiz |
| Admin | Vite + React 19 + Ant Design + TanStack Query | Tez CRUD, tayyor jadval/forma komponentlari, SEO yo'q |

Barchasida: TypeScript strict, TanStack Query, Zod, `openapi-typescript` bilan generatsiya
qilingan API tiplari.

---

## 4. Ochiq savollar (keyinroq hal qilinadi)

- [ ] Instagram ma'lumotlari uchun aniq provayder va byudjet (Modash / HypeAuditor / RapidAPI)
- [ ] To'lov tizimi (Payme / Click / Uzum) — Phase 2/3
- [ ] Influencerlarning o'zi profilini "claim" qilishi (`Influencer.ownerUserId` maydoni
      hozirdan qo'yiladi, lekin oqim yozilmaydi)
- [ ] Audience demographics manbai (yosh/jins/geo) — Phase 2
- [ ] Domen nomi va brending

## 5. Muhim eslatma

Ijtimoiy tarmoqlardan ma'lumot olishda **imkon qadar rasmiy API yoki qonuniy ma'lumot
provayderlaridan** foydalaniladi. Scraping ToS buzilishi va IP bloklanish riski tug'diradi —
uni oxirgi chora sifatida va faqat huquqiy tekshiruvdan keyin ko'rib chiqiladi.

---

## 6. Reviziyalar jurnali

**2026-08-28 — arxitektura ko'rigi (v1.1).** Hujjatlar qayta ko'rib chiqildi,
uchta aniq muammo tuzatildi:
1. **ADR-004 aniqlashtirildi:** bot telefon raqamini bilmaydi — birinchi kirishda
   `botDeepLink` + `request_contact` orqali phone->telegramId bog'lash oqimi qo'shildi.
2. **popularityScore:** min-max normalizatsiya (butun baza bo'ylab qayta hisoblashni
   talab qiladi, deterministik emas) o'rniga **qat'iy shkalalar** — bitta influencerni
   `recalculate` qilish endi mustaqil ishlaydi (`01-ARCHITECTURE.md` §5).
3. **Web token modeli:** httpOnly cookie'ni JS o'qiy olmaydi — model aniqlashtirildi:
   refresh cookie'da, access xotirada + SSR uchun qisqa muddatli cookie
   (`web/AGENTS.md`, STEP-W-08).

Qo'shimcha: `GET /app/plans` kontraktga qo'shildi; `applyStats` uchun tarixiy
`measuredAt` qoidasi (backfill joriy holatni buzmaydi) yozildi; suggest qidiruvi
`username` bo'yicha ham ishlashi belgilandi.
