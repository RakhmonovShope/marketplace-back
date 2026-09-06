# 09 — Mahsulot g'oyalari backlog'i (P2/P3)

> Yadro qiymat zanjiri: **topish → tahlil → tanlash → aloqa**. Hozir zanjir "aloqa" da uziladi (telefon/telegram ko'rsatiladi, lekin
> platforma undan keyin nima bo'lganini bilmaydi). Ko'p g'oyalar shu bo'shliqni yopadi va monetizatsiya asosini beradi.
> Hajm: S (1–3 kun), M (1–2 hafta), L (2–4 hafta). Har g'oya: **Nima → Nega → Qanday (qisqa) → Hajm → Repo**.

---

## A. Ma'lumot va ishonch

### 1. Creator claim + OAuth connect (ADR-016 taklifi) — L, backend+web+miniapp+admin

> ✅ Bajarildi (2026-09-06, B2-34 + A2-11 + W2-13 + M2-13): backend `InfluencerClaim` (PENDING/APPROVED/REJECTED, admin moderatsiya → `ownerUserId`), `OAuthConnection` (AES-256-GCM tokenlar), Google OAuth start/callback (HMAC state, YouTube Data + Analytics scope), `DATA_SOURCE.OWNER_API` + `YouTubeOwnerProvider` (mine=true, AudienceDemographics jins/yosh/davlat), sync OWNER_API akkauntni owner provayder bilan; creator kabineti (aloqa/bio, narxlar → minPrice, statistika), `/auth/me.creatorOf`, e2e 4 + unit 2; admin /claims moderatsiya sahifasi; web «Bu mening profilim» + /creator (statistika, aloqa, narxlar, YouTube ulash); miniapp ClaimSheet + /creator (YouTube — brauzerda). Cheklov: GOOGLE_CLIENT_ID/SECRET deploy'da; Instagram/TikTok OAuth — keyingi bosqich.
Influencer Telegram orqali kiradi → "Bu men" (claim) → admin tasdiqlaydi → YouTube (OAuth), Instagram (Facebook Login, `instagram_manage_insights`) ulaydi → rasmiy stats + **auditoriya demografiyasi** (`AudienceDemographics` allaqachon schema'da) → `dataSource: OWNER_API`, `isVerified` avtomatik, o'z narxlari/aloqasini tahrirlaydi, profil ko'rishlari statistikasini ko'radi (creator dashboard). Ma'lumot muammosini qonuniy hal qiladi (`03-DATA-QUALITY` §2). `Influencer.ownerUserId` allaqachon bor.

### 2. Auditoriya sifati va benchmark'lar — M, backend+web+miniapp
`03` §3.1–3.2: `qualityScore`, kategoriya × tier median'lari, "kategoriya o'rtachasidan ×1.8", taxminiy narx. Kartada belgi, filterda `qualityMin`.

### 3. O'zgarish alertlari — M, backend(bot)+miniapp+web

> ✅ Bajarildi (2026-09-06, B2-33): backend `Notification` jadvali (FOLLOWERS_CHANGE ±ALERT_FOLLOWERS_PCT % / growth7d, VERIFIED, PRICE_NEW — sevimlilar; SAVED_SEARCH_NEW — notifyNew digest), `notification` navbatida kunlik `daily-alerts` (ALERTS_CRON) + `send` (Telegram bot HTML xabar, `allowsWriteToPm && notifyTelegram`, dedupKey), `User.allowsWriteToPm` initData'dan, `PUT /auth/me {notifyTelegram}`, GET/POST /app/notifications, admin POST /admin/alerts/run (ALERT__RUN), e2e 3 test; miniapp /notifications sahifasi, profilda toggle (`requestWriteAccess`), startapp `ss_`. Web UI (qo'ng'iroq) — alohida qadam.
"Kuzatish" (favorites ustida): followers ±10 %, ER anomaliyasi, yangi narx, verified bo'ldi → Telegram bot xabari (`requestWriteAccess`), web'da bildirishnoma. `SavedSearch.notifyNew` (B-42 ⏸) shu mexanizmga qo'shiladi: "yangi mos influencer". Backend: `notification` navbati (bor, bo'sh processor), `Notification` jadvali, kunlik digest.

### 4. Tarixiy ma'lumot to'ldirish vositasi — S, admin
STATS import (`measuredAt`) bor; admin'da "Tarixni yuklash" (akkaunt sahifasidan, shablon oldindan to'ldirilgan) + Telegram/YouTube uchun provayderdan tarixiy ma'lumot (YouTube Analytics API — OAuth'dan keyin).

---

## B. Biznes foydalanuvchi (talab tomoni)

### 5. Aloqa oqimi va lead'lar — M, backend+web+miniapp+admin ⚠️ monetizatsiya asosi

> ✅ Bajarildi (2026-09-06, B2-30 + W2-10 + M2-10 + A2-10): Backend: `ContactRequest` (channel, message ≤1000, budget, status NEW|CONTACTED|CLOSED, adminNote, source), `POST /app/influencers/:id/contact-requests` (auth, 10/min, nashr qilinganlarga; ContactClick ham yoziladi), `GET /app/me/contact-requests`, admin `POST /admin/leads/search` (DSL: status/channel/influencerId/createdAt), `GET /admin/leads/stats` (bugun/7/30 kun/jami, bosishlar, holat/kanal kesimi, top-10 influencer), `PUT /admin/leads/:id`; ruxsatlar `LEAD__VIEW/UPDATE` (seed + dev rollari); e2e 2 test. Web: profil sahifasida "Aloqa so'rovi" dialogi (kanal/xabar/byudjet, mehmon → kirish), `/requests` sahifasi (nav, protected), uz/ru. Miniapp: sheet + `/requests` sahifasi + profil havolasi, lug'at. Admin: Lead'lar sahifasi (stat kartalar, top ro'yxat, jadval, holat/izoh modal), menyu. Creator'ga kelgan so'rovlar — B2-34 (claim) bilan.
"Aloqa" tugmasi → `ContactRequest { userId, influencerId, channel, message?, budget?, createdAt }` (telefon ko'rsatilgan bo'lsa ham hodisa yoziladi).
Biznes uchun: "so'rovlarim" ro'yxati; admin: lead statistikasi (qaysi influencer ko'p so'ralgan); creator (claim qilgan bo'lsa): kelgan so'rovlar.
Keyin: platforma ichida chat (Telegram bot orqali relay) → komissiya/pay-per-lead.

### 6. Ro'yxatlar (collections) — S/M, backend+web+miniapp

> ✅ Bajarildi (2026-09-06, B2-31 + W2-11 + M2-11): backend List/ListItem + migratsiya (mavjud favorites → default "Saqlanganlar"), FavoriteService ↔ default ro'yxat ko'zgusi, GET/POST/PUT/DELETE /app/lists, items, CSV eksport (aloqa ustunlari plan bo'yicha), limit 20×500, e2e 4 test; web /lists, /lists/[id], profil sahifasida "ro'yxatga qo'shish" dialogi, CSV yuklab olish; miniapp /lists, /lists/:id, AddToListSheet, profil havolasi.
Favorites ustida nomlangan ro'yxatlar ("Ramazon kampaniyasi"), eslatma, tartib; jamoa bilan ulashish (§9), CSV/PDF eksport (§7). Schema: `List { userId, name }`, `ListItem`. `Favorite` → default ro'yxat.

### 7. Media kit / PDF eksport — M, backend

> ✅ Bajarildi (2026-09-06, B2-43): backend `GET /app/influencers/:slug/media-kit.pdf` (ko'rsatkichlar, tarmoqlar, narxlar, benchmark; aloqa faqat `Plan.canSeeContacts` bilan; lokal avatar PDF ichida) va `GET /app/lists/:id/export.pdf` (`Plan.canExport`); `pdfkit` — brauzersiz, worker'siz. Kirill uchun `MEDIA_KIT_FONT` (TTF) berilsa shrift o'rnatiladi, aks holda matn lotinga translit qilinadi (B2-37 helper'i). e2e 2 test. Web: profilda «Media kit (PDF)» tugmasi, ro'yxatda «PDF yuklab olish» (umumiy `downloadFile` yordamchisi).
Influencer profili PDF (avatar, statistika, grafik, narxlar, aloqa — planga qarab) va ro'yxat/taqqoslash PDF. `puppeteer`/`@react-pdf` worker'da; `Plan.canExport` bor.

### 8. Brief / kampaniya so'rovi — L, hammasi
Biznes brief yaratadi (kategoriya, byudjet, format, muddat, shahar) → tizim mos influencerlarni taklif qiladi (filter + benchmark + narx) → ro'yxat → aloqa (§5). Keyingi bosqich: influencer'lar briefga javob beradi (claim qilganlar) — marketplace (Phase 3).

### 9. Jamoa akkauntlari (agentliklar) — M, backend+web+admin

> ✅ Bajarildi (2026-09-06, B2-41 + W2-21): backend `Organization` + `OrgMember` (OWNER/ADMIN/MEMBER), `User.organizationId`, `Plan.teamMembers` (FREE 1, PRO 2, BUSINESS 5, ENTERPRISE 25); `GET/POST/PUT/DELETE /app/org`, a'zo qo'shish (telefon/@username/email), chiqarish, `POST /app/org/leave`; umumiy resurslar — `GET /app/org/lists|favorites|leads` (kim qo'shgani ko'rinadi); e2e 4 test. Web `/team` sahifasi (a'zolar, chegara + tarifga havola, umumiy ro'yxat/so'rov/sevimlilar), profilda havola.
`Organization { name, ownerId }`, `OrgMember`, umumiy favorites/ro'yxatlar/so'rovlar, BUSINESS plan → "5 ta a'zo". `User.organizationId`.

### 10. Programmatik SEO sahifalari — M, backend+web

> ✅ Bajarildi (2026-09-06, B2-36 + W2-14): backend `GET /public/seo/landing?category&city&platform&tier` (top-12 karta, totalItems, o'rtacha ER/obunachi, priceFrom, ichki havolalar: boshqa shaharlar/kategoriyalar/platformalar; 10 daq kesh) va `GET /public/seo/landings` (sitemap/statik parametrlar uchun, `SEO_LANDING_MIN`=3, `SEO_LANDING_LIMIT`=300); `City.slug` + migratsiya (mavjud shaharlarga backfill) va admin CRUD'da avtomatik slug; e2e 3 test. Web: `/catalog/<kategoriya>/<shahar>` landing (unikal title/description/canonical/hreflang, H1, statistika, ItemList JSON-LD, ichki havola tarmog'i), sitemap'ga landing URL'lari. Eslatma: root layout CSP nonce uchun `headers()` o'qigani sababli sahifa so'rovga bog'liq render qilinadi (ma'lumot 300 s fetch keshida).
Kategoriya × shahar × platforma × tier landing'lar ("Toshkentdagi Instagram food bloggerlar (10K–50K)"): `GET /public/seo/landing`, `generateMetadata`, ichki havola tarmog'i, sitemap. Organik trafikning asosiy manbai (`04-WEB` §2).

### 11. Taqqoslashni saqlash va ulashish (B-41.4 ⏸) — S, backend+web+miniapp

> ✅ Bajarildi (2026-09-06, B2-32 + W2-12 + M2-12): backend POST/GET/DELETE /app/comparison + GET /public/comparison/:id (read-only), `url`/`startapp=cmp_<id>`/`tgUrl`; saqlangan qidiruvlar GET/POST/PUT/DELETE /app/saved-searches + POST :id/run (filters = InfluencerSearchDto, notifyNew → B2-33), e2e 2 test; web /compare «Saqlash va ulashish» → havola nusxalanadi + public /compare/[id], katalogda «Qidiruvni saqlash» + /saved-searches (→ /catalog?… fromApiParams); miniapp MainButton «Saqlash va ulashish» → shareURL(startapp=cmp_), /compare/:id, startapp cmp_ redirect, kategoriya sahifasida bookmark sheet + /saved, /saved/:id.
`Comparison` schema bor; `POST /app/comparison` + public havola `/compare/<id>` (read-only) + `startapp=cmp_<id>`.

### 12. Saqlangan qidiruvlar (B-42/W-23 ⏸) — S/M

> ✅ Bajarildi (2026-09-06, B2-32 + W2-12 + M2-12): §11 izohiga qarang — `/app/saved-searches` + web `/saved-searches` + miniapp `/saved`; `notifyNew` bayrog'i B2-33 alertlarida ishlatiladi.
Schema bor; UI "Qidiruvni saqlash" + §3 alertlar bilan qiymat oshadi.

---

## C. Monetizatsiya (ADR-008 gating tayyor)

### 13. To'lov va obuna — L, backend+web+miniapp

> ✅ Bajarildi (2026-09-06, B2-40 + W2-20 + M2-20): backend `Payment` modeli + `POST /app/billing/checkout` (PAYME/CLICK → to'lov havolasi, TELEGRAM_STARS → `openInvoice` uchun invoice link), Payme Merchant API (JSON-RPC: CheckPerformTransaction/CreateTransaction/PerformTransaction/CancelTransaction/CheckTransaction/GetStatement, Basic auth, idempotent), Click prepare/complete (md5 imzo), Telegram Stars (bot `pre_checkout_query` + `successful_payment`), obuna uzayishi va kunlik `expire-subscriptions` job'i, admin `GET /admin/payments`; gating `FEATURE_GATING_ENABLED=true` bilan e2e'da tekshirildi (PRO — aloqa ochiq, FREE — kvota 429 va `locked: ['contact']`); e2e 6 test. Web `/pricing` (tariflar, Payme/Click, to'lovlar tarixi), miniapp `/pricing` (Telegram Stars). Sandbox kalitlari deploy'da (PAYME_*/CLICK_*).
`FEATURE_GATING_ENABLED=true` uchun: Payme/Click (web), **Telegram Stars/Payments** (mini app — `openInvoice`), `Subscription` yaratish, muddati, avto-eskirish job'i, chek/hisob-faktura. `PaymentProvider` interfeysi (Payme JSON-RPC, Click prepare/complete), webhook idempotentlik.
Gating rejasi: FREE — 10 qidiruv/kun, aloqa yashirin, grafik 30d; PRO — cheksiz, aloqa, 1y grafik, eksport; BUSINESS — jamoa, API.

### 14. Featured placement (B-47/A-25 ⏸) — M, backend+admin

> ✅ Bajarildi (2026-09-06, B2-42 + A2-20): backend admin CRUD (`POST /admin/featured/search|/admin/featured`, `PUT/DELETE /admin/featured/:id`, `POST /admin/featured/sync`), public `GET /public/featured?type&categoryId&limit` (5 daq kesh), soatlik `sync-featured` job `Influencer.isFeatured` ni faol joylashtirishlarga moslaydi; creator o'zi sotib oladi — `POST /app/creator/featured/checkout` (`Payment.kind=FEATURED`, `FEATURED_PRICE_PER_DAY` × kun, to'lov tasdiqlansa `FeaturedPlacement` yaratiladi, idempotent); e2e 3 test. Admin: /featured sahifasi (CRUD, filtr, isFeatured sync). Eslatma: `Payment.planId` endi nullable (FEATURED to'lovlari tarifsiz).
Schema bor; admin CRUD, dashboard/qidiruvda `isFeatured` (bor), kategoriya top; hisob (pullik joylashtirish) — creator claim bilan o'zi sotib oladi.

### 15. Public API (BUSINESS/ENTERPRISE) — M, backend
API kalitlari (`ApiKey { userId, keyHash, scopes, rateLimit }`), `/api/v1/partner/**` (search, profile), kunlik kvota, Swagger 4-definition. Agentliklar/CRM integratsiyasi.

---

## D. Qidiruv va tavsiya

### 16. Qidiruv sifati — M, backend

> ✅ Bajarildi (2026-09-06, B2-37): `Influencer.searchText` — nom/username va lotin↔kirill translit variantlari (`helpers/translit.ts`, unit testlar), trigram indekslar qayta tiklandi (`influencer_searchtext_trgm`, `influencer_fullname_trgm`, `social_username_trgm`), qidiruvda relevantlik tartibi (`similarity`/`word_similarity`, 300 nomzod oynasi), `suggest` reyting bilan, `@username` prefiksi faqat akkaunt nomi bo'yicha, admin `GET /admin/search/gaps` (natijasiz so'rovlar). Sinonim jadvali (`SearchSynonym`) — keyingi bosqichda.
`03` §3.5: trigram ranking, `@username`, lotin/kirill translit, sinonimlar (`SearchSynonym` jadvali admin'da), zero-result loglari → admin "kontent bo'shliqlari".

### 17. O'xshash influencerlar — S, backend+web+miniapp

> ✅ Bajarildi (2026-09-06, B2-37 + W2-15 + M2-14): backend `GET /app/influencers/:slug/similar` — asosiy kategoriya, shahar, tier ±1 va popularityScore yaqinligi bo'yicha 6 ta (10 daq kesh); web profil ostida kartalar bloki, miniapp'da gorizontal ro'yxat.
Profil ostida: shu kategoriya, tier ±1, shahar, `popularityScore` yaqin — 6 ta. Keyin: "birga ko'rilgan" (`ProfileView` ko'nikma, kunlik hisob).

### 18. Filter qo'shimchalari — S
"Narxi bor", "ma'lumot yangilangan (30 kun)", "auditoriya sifati", jins, yosh (birthYear), "kontent tili"; sort: "narx / 1k obunachi" (CPM), "sifat".

---

## E. Telegram ekotizimi

### 19. Bot inline rejimi — S/M, backend(bot)
`@bot food toshkent` → inline natijalar (karta + link) — chatda ulashish; `/top food`, `/trending` buyruqlari; kunlik digest (obuna).

### 20. Share card rasmi — S, backend
`06-MINIAPP` §3: `card.png` (sharp/SVG) — Telegram/Instagram story'ga; web Open Graph rasmi ham shu (`og:image` dinamik).

### 21. Mini App onboarding va push — S, miniapp+backend
Birinchi ochilishda 3 ta ekran (nima, qanday, kategoriya tanlash → shaxsiy home); `requestWriteAccess` → §3 alertlar.

---

## F. Admin va operatsiyalar

### 22. Audit log — M, backend+admin
`AuditLog { actorId, action, entity, entityId, before, after, ip, requestId }` — admin `POST/PUT/DELETE` interceptor; influencer sahifasida "tarix"; rol/permission o'zgarishlari.

### 23. Ma'lumot sifati paneli — M (`03` §4, `05` §3)

### 24. Dublikat aniqlash va birlashtirish — M, backend+admin
Bir xil `platform+username` turli influencerlarda; ism o'xshashligi (trigram); "Merge" oqimi (akkauntlar, narxlar, favorites ko'chadi, eski slug → redirect `SlugAlias`).

### 25. Rejalashtirilgan hisobotlar — S, backend
Haftalik Telegram/email adminlarga: yangi userlar, top qidiruvlar, zero-result, sync sog'ligi, lead'lar (§5).

### 26. Kontent moderatsiyasi va shikoyat — S, hammasi
Profilda "Shikoyat" (noto'g'ri ma'lumot, firibgarlik) → `Report` → admin navbati; claim so'rovlari moderatsiyasi (§1).

---

## G. Platforma

### 27. Ingliz tili (EN) — M, hammasi
ADR-011 `Uz/Ru` maydonlari — 3-til uchun `nameI18n Json` yoki `Translation` jadvali; UI i18n JSON'lar (next-intl/dictionary) oson. Xorijiy brendlar uchun.

### 28. Foydalanuvchi ma'lumotlarini boshqarish — S, backend+web+miniapp
"Akkauntni o'chirish" (soft + 30 kun), ma'lumot eksporti (JSON) — ishonch va do'kon (Telegram) talablari.

### 29. Web PWA, miniapp offline — S (`04` §6, `06` §5)

### 30. Mobil ilova (React Native / Expo) — L, keyin
Mini app + web'dan keyin, agar Telegram tashqarisida auditoriya bo'lsa (iOS Safari foydalanuvchilari). API tayyor.

---

## Tavsiya etilgan navbat (yadro P0/P1 tuzatishlardan keyin)

| # | Feature | Sabab |
|---|---|---|
| 1 | §5 Lead/aloqa oqimi + §6 ro'yxatlar | "Tanlash → aloqa" zanjirini yopadi, monetizatsiya uchun o'lchov beradi |
| 2 | §1 Creator claim/connect | Ma'lumot muammosi (mahsulotning asosiy xavfi) |
| 3 | §10 SEO landing + §17 o'xshashlar + §16 qidiruv | Organik o'sish |
| 4 | §3 alertlar + §12 saqlangan qidiruv + §19 bot | Qaytib kelish (retention), Telegram auditoriyasi |
| 5 | §2 sifat/benchmark + §7 media kit | Farqlovchi qiymat (raqobatchilar oddiy katalog) |
| 6 | §13 to'lov + §9 jamoa + §14 featured + §15 API | Daromad |
| 7 | §22–26 admin operatsiyalari | Masshtabda sifat |

---

## Taklif qilingan ADR'lar (00-CONTEXT ga qo'shish uchun)

- **ADR-016** — 4-ma'lumot kanali `OWNER_API`: creator claim + OAuth connect (§1).
- **ADR-017** — Lead-first monetizatsiya: aloqa hodisalari loglanadi, birinchi to'lov modeli — obuna (ADR-008) + pay-per-lead keyin (§5, §13).
- **ADR-018** — Programmatik SEO sahifalari web'da (§10), kontrakt `GET /public/seo/landing`.
