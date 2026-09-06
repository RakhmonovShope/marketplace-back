# 09 — Mahsulot g'oyalari backlog'i (P2/P3)

> Yadro qiymat zanjiri: **topish → tahlil → tanlash → aloqa**. Hozir zanjir "aloqa" da uziladi (telefon/telegram ko'rsatiladi, lekin
> platforma undan keyin nima bo'lganini bilmaydi). Ko'p g'oyalar shu bo'shliqni yopadi va monetizatsiya asosini beradi.
> Hajm: S (1–3 kun), M (1–2 hafta), L (2–4 hafta). Har g'oya: **Nima → Nega → Qanday (qisqa) → Hajm → Repo**.

---

## A. Ma'lumot va ishonch

### 1. Creator claim + OAuth connect (ADR-016 taklifi) — L, backend+web+miniapp+admin
Influencer Telegram orqali kiradi → "Bu men" (claim) → admin tasdiqlaydi → YouTube (OAuth), Instagram (Facebook Login, `instagram_manage_insights`) ulaydi → rasmiy stats + **auditoriya demografiyasi** (`AudienceDemographics` allaqachon schema'da) → `dataSource: OWNER_API`, `isVerified` avtomatik, o'z narxlari/aloqasini tahrirlaydi, profil ko'rishlari statistikasini ko'radi (creator dashboard). Ma'lumot muammosini qonuniy hal qiladi (`03-DATA-QUALITY` §2). `Influencer.ownerUserId` allaqachon bor.

### 2. Auditoriya sifati va benchmark'lar — M, backend+web+miniapp
`03` §3.1–3.2: `qualityScore`, kategoriya × tier median'lari, "kategoriya o'rtachasidan ×1.8", taxminiy narx. Kartada belgi, filterda `qualityMin`.

### 3. O'zgarish alertlari — M, backend(bot)+miniapp+web
"Kuzatish" (favorites ustida): followers ±10 %, ER anomaliyasi, yangi narx, verified bo'ldi → Telegram bot xabari (`requestWriteAccess`), web'da bildirishnoma. `SavedSearch.notifyNew` (B-42 ⏸) shu mexanizmga qo'shiladi: "yangi mos influencer". Backend: `notification` navbati (bor, bo'sh processor), `Notification` jadvali, kunlik digest.

### 4. Tarixiy ma'lumot to'ldirish vositasi — S, admin
STATS import (`measuredAt`) bor; admin'da "Tarixni yuklash" (akkaunt sahifasidan, shablon oldindan to'ldirilgan) + Telegram/YouTube uchun provayderdan tarixiy ma'lumot (YouTube Analytics API — OAuth'dan keyin).

---

## B. Biznes foydalanuvchi (talab tomoni)

### 5. Aloqa oqimi va lead'lar — M, backend+web+miniapp+admin ⚠️ monetizatsiya asosi
"Aloqa" tugmasi → `ContactRequest { userId, influencerId, channel, message?, budget?, createdAt }` (telefon ko'rsatilgan bo'lsa ham hodisa yoziladi).
Biznes uchun: "so'rovlarim" ro'yxati; admin: lead statistikasi (qaysi influencer ko'p so'ralgan); creator (claim qilgan bo'lsa): kelgan so'rovlar.
Keyin: platforma ichida chat (Telegram bot orqali relay) → komissiya/pay-per-lead.

### 6. Ro'yxatlar (collections) — S/M, backend+web+miniapp
Favorites ustida nomlangan ro'yxatlar ("Ramazon kampaniyasi"), eslatma, tartib; jamoa bilan ulashish (§9), CSV/PDF eksport (§7). Schema: `List { userId, name }`, `ListItem`. `Favorite` → default ro'yxat.

### 7. Media kit / PDF eksport — M, backend
Influencer profili PDF (avatar, statistika, grafik, narxlar, aloqa — planga qarab) va ro'yxat/taqqoslash PDF. `puppeteer`/`@react-pdf` worker'da; `Plan.canExport` bor.

### 8. Brief / kampaniya so'rovi — L, hammasi
Biznes brief yaratadi (kategoriya, byudjet, format, muddat, shahar) → tizim mos influencerlarni taklif qiladi (filter + benchmark + narx) → ro'yxat → aloqa (§5). Keyingi bosqich: influencer'lar briefga javob beradi (claim qilganlar) — marketplace (Phase 3).

### 9. Jamoa akkauntlari (agentliklar) — M, backend+web+admin
`Organization { name, ownerId }`, `OrgMember`, umumiy favorites/ro'yxatlar/so'rovlar, BUSINESS plan → "5 ta a'zo". `User.organizationId`.

### 10. Programmatik SEO sahifalari — M, backend+web
Kategoriya × shahar × platforma × tier landing'lar ("Toshkentdagi Instagram food bloggerlar (10K–50K)"): `GET /public/seo/landing`, `generateMetadata`, ichki havola tarmog'i, sitemap. Organik trafikning asosiy manbai (`04-WEB` §2).

### 11. Taqqoslashni saqlash va ulashish (B-41.4 ⏸) — S, backend+web+miniapp
`Comparison` schema bor; `POST /app/comparison` + public havola `/compare/<id>` (read-only) + `startapp=cmp_<id>`.

### 12. Saqlangan qidiruvlar (B-42/W-23 ⏸) — S/M
Schema bor; UI "Qidiruvni saqlash" + §3 alertlar bilan qiymat oshadi.

---

## C. Monetizatsiya (ADR-008 gating tayyor)

### 13. To'lov va obuna — L, backend+web+miniapp
`FEATURE_GATING_ENABLED=true` uchun: Payme/Click (web), **Telegram Stars/Payments** (mini app — `openInvoice`), `Subscription` yaratish, muddati, avto-eskirish job'i, chek/hisob-faktura. `PaymentProvider` interfeysi (Payme JSON-RPC, Click prepare/complete), webhook idempotentlik.
Gating rejasi: FREE — 10 qidiruv/kun, aloqa yashirin, grafik 30d; PRO — cheksiz, aloqa, 1y grafik, eksport; BUSINESS — jamoa, API.

### 14. Featured placement (B-47/A-25 ⏸) — M, backend+admin
Schema bor; admin CRUD, dashboard/qidiruvda `isFeatured` (bor), kategoriya top; hisob (pullik joylashtirish) — creator claim bilan o'zi sotib oladi.

### 15. Public API (BUSINESS/ENTERPRISE) — M, backend
API kalitlari (`ApiKey { userId, keyHash, scopes, rateLimit }`), `/api/v1/partner/**` (search, profile), kunlik kvota, Swagger 4-definition. Agentliklar/CRM integratsiyasi.

---

## D. Qidiruv va tavsiya

### 16. Qidiruv sifati — M, backend
`03` §3.5: trigram ranking, `@username`, lotin/kirill translit, sinonimlar (`SearchSynonym` jadvali admin'da), zero-result loglari → admin "kontent bo'shliqlari".

### 17. O'xshash influencerlar — S, backend+web+miniapp
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
