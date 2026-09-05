# 13 — Mahsulot g'oyalari backlog'i (P3)

> `05-CORE` yadro ustiga quriladigan featurelar. Har biri: **Nima → Nega foydali → Qanday (qisqa) → Hajm**.
> Hajm: S (1–3 kun), M (1–2 hafta), L (2–4 hafta). Ustuvorlik jamoa/biznes qaroriga bog'liq — jadval oxirida tavsiya.

---

## A. Mijoz tajribasi

### 1. Wishlist / Sevimlilar — S
`Favorite { userId, productId, @@unique }`. `POST/DELETE /v1/app/favorites/:productId`, ro'yxat. Mehmon — localStorage, login'da merge (savat kabi). Narx tushganda xabar (`price.dropped` event) — Telegram.

### 2. Yaqinda ko'rilganlar — S
Redis `LPUSH recent:<userId>` (max 20, TTL 30 kun). Mahsulot sahifasida "yana qarang".

### 3. Mahsulot taqqoslash — S
Bir kategoriya ichida 2–4 ta; atributlar jadvali (Attribute/AttributeOption dan). Server tomonida faqat `GET /v1/app/products/compare?ids=` (atributlar bilan).

### 4. Manzillar va yetkazib berish zonalari — M
`Address` (D6), `DeliveryZone { polygon/geojson yoki tuman ro'yxati, fee, etaHours }`, `PricingService` ga `deliveryFee`. Pickup punktlari (`PickupPoint`). Yandex Delivery / BTS integratsiyasi — keyin, `DeliveryProvider` interfeysi.

### 5. Buyurtmani kuzatish — S
Mijoz `GET /v1/app/orders/:id` da `statusHistory` + ETA; Telegram'ga har status o'zgarishida xabar (`05-CORE` §9).

### 6. Qidiruv sifat — M
`pg_trgm` + `tsvector` (`uz`/`ru` config — Postgres'da o'zbek stemmer yo'q → `simple` + trigram), sinonimlar jadvali (`telefon` ↔ `smartfon`), "siz nazarda tutdingizmi", qidiruv loglari (`SearchLog`) → mashhur so'rovlar, natijasiz so'rovlar → admin ko'radi. 50k+ mahsulotda Meilisearch (`SearchService` interfeysi ortida).

### 7. Tavsiyalar — M
Bosqich 1 (SQL): "shu kategoriyada mashhur", "birga sotib olinadi" (`OrderItem` co-occurrence, kunlik cron → `ProductRelation`). Bosqich 2: foydalanuvchi tarixi (ko'rilgan/sotib olingan kategoriyalar) bo'yicha `home` feed. AI/embedding — keyin.

### 8. Telegram Mini App do'kon — L
Influencer loyihasidagi `initData` auth kodi qayta ishlatiladi. Katalog + savat + buyurtma; to'lov Telegram Payments (Click/Payme provayderi) yoki web'ga o'tkazish. Auditoriya O'zbekistonda Telegram'da — konversiya yuqori.

### 9. Bildirishnomalar markazi (in-app) — S
`Notification` jadvali (`05-CORE` §9), `GET /v1/app/notifications`, `readAt`, WS `notification.new`.

### 10. Ko'p tillilik kengaytmasi — S
`Uz/Ru` + `En` kerak bo'lsa `Uz/Ru` suffiks modeli sig'maydi → `Translation { entity, entityId, field, lang, value }` jadvaliga o'tish yoki `nameI18n Json`. Hozircha kerak emas; qaror faqat 3-til paydo bo'lganda.

---

## B. Sotuvchi (multi-vendor) — L

### 11. Seller portal
`Store.ownerId` (D5), `SELLER` roli, `StoreOwnerGuard` (resurs darajasidagi ruxsat: `product.storeId === user.storeId`), `/v1/seller/**`: o'z mahsulotlari, buyurtmalari (`OrderItem` bo'yicha bo'lingan — bitta buyurtma bir nechta do'kon), stok, statistika. Onboarding: ariza → admin tasdiqlaydi (`Store.status: PENDING|APPROVED|SUSPENDED`).

### 12. Komissiya va to'lovlar (payout) — L
`Commission` (do'kon/kategoriya bo'yicha %), `Ledger` (har `DELIVERED` buyurtma uchun yozuv), `Payout` (haftalik, admin tasdiqlaydi), hisobot. Buxgalteriya to'g'riligi uchun `Decimal` + append-only ledger.

### 13. Do'kon sahifasi va obuna — S
`GET /v1/app/stores/:pagename` (D5 `pagename @unique`), do'konga obuna (`StoreFollower`), yangi mahsulotda xabar.

---

## C. Admin va operatsiyalar

### 14. Audit log — M
`AuditLog { actorId, action, entity, entityId, before Json, after Json, ip, requestId, createdAt }`. `AuditInterceptor` — `POST/PUT/PATCH/DELETE` `/v1/admin/**` da; `before` — servis `getById` orqali (yoki Prisma extension `update` da). Admin UI: entity bo'yicha tarix, "kim o'chirdi". Retention 1 yil.

### 15. Sozlamalar (Settings) — S
`Setting { key @unique, value Json, group }` + Redis cache: min buyurtma summasi, yetkazish narxi, texnik ishlar rejimi (`maintenance` → 503 public'da), aloqa ma'lumotlari, ijtimoiy tarmoqlar. Admin UI'da tahrirlanadi, deploy'siz.

### 16. Feature flag'lar — S
`Setting` ustida: `features.reviews`, `features.promocodes`, `features.telegramLogin`. `@RequireFeature('reviews')` guard. A/B — keyin.

### 17. CSV/Excel import-eksport — M
Mahsulotlar import (BullMQ `import` navbati, `exceljs`), xato hisoboti qator bo'yicha, "dry-run"; buyurtmalar/mijozlar eksport. Katta fayl → S3 presigned (`07-FILES` §6).

### 18. Analytics dashboard — M
`05-CORE` §10 + voronka (ko'rish → savat → buyurtma → to'lov), kohorta (birinchi xarid oyi), kategoriya bo'yicha daromad, qaytarish sabablari. Kunlik agregat jadvallar; Metabase/Grafana bilan to'g'ridan-to'g'ri Postgres read-replica'ga ulash — eng arzon yo'l.

### 19. Kontent rejalashtirish — S
`Banner.startAt/endAt` (D10), `Promotion` muddat, `Page.publishedAt`; "preview" rejimi (`?preview=<token>`).

### 20. Moderatsiya navbati — S
Sharhlar (D8), seller mahsulotlari (11), do'kon arizalari — bitta "Moderation" bo'limi: `status`, `assignedTo`, sabab.

### 21. Mijoz qo'llab-quvvatlash chati — M
Mavjud `Message`/`ChatGateway` → `Conversation` (mijoz ↔ admin/seller, `orderId` bilan), o'qilmaganlar soni, biriktirmalar (`ImageUpload`), tayyor javoblar. Alternativa: Telegram bot orqali support (arzonroq, mijoz odatlangan).

---

## D. O'sish (growth)

### 22. SEO — S/M
`slug @unique` (D3/D4), `GET /v1/app/sitemap.xml` (cron generatsiya, S3/Redis'da), `seoTitle/Description` maydonlari, OpenGraph rasmi (`07-FILES` `og` variant), `canonical`. Frontend SSR (Next.js) bilan birga ishlaydi.

### 23. Promokod kampaniyalari va referal — M
`Promocode` D9 + referal (`User.referredById`, `ReferralReward`), birinchi xarid chegirmasi, tug'ilgan kun (D6 `birthday Date`).

### 24. Loyalty / cashback — L
`WalletTransaction` (append-only), ball to'plash (`% of total`), sarflash (`PricingService` ga `walletAmount`), muddati. Uzum/Yandex Plus tajribasi — O'zbekiston bozorida kutiladi.

### 25. Push (FCM/APNs) va SMS kampaniyalar — M
`Device { userId, token, platform }`, `notification` navbati kanali; segmentlar (`Setting`/SQL), tashlab ketilgan savat (24 soat) — eng foydali trigger.

### 26. Gift card / sertifikat — M
`GiftCard { code, balance, expiresAt }`, to'lov usuli sifatida `PaymentProvider`.

---

## E. Texnik g'oyalar

### 27. Outbox pattern — M
`order.created` event yo'qolmasligi uchun: event `Outbox` jadvaliga transaction ichida, worker BullMQ'ga uzatadi. To'lov/bildirishnoma ishonchliligi.

### 28. Read-replica — S (infratuzilma)
Public katalog `findMany` → replica (`prisma-extension-read-replicas`), yozish — primary.

### 29. GraphQL / BFF — L
Kerak bo'lmaydi — REST + `openapi-typescript` yetarli. Faqat mobil ilova murakkab ekranlarda over-fetching bo'lsa qayta ko'rish.

### 30. Rasmga AI (fon olib tashlash, alt-matn) — S
Seller yuklagan rasm → `rembg` (alohida servis) yoki bulut API; `alt` matn Uz/Ru — SEO. `image` navbatiga ixtiyoriy qadam.

---

## Tavsiya etilgan ketma-ketlik (yadro tayyor bo'lgach)

| Navbat | Feature | Sabab |
|---|---|---|
| 1 | 15 Settings, 14 Audit log, 20 Moderation | operatsiyalar xavfsizligi, arzon |
| 2 | 1 Wishlist, 5 Kuzatish, 9 Bildirishnomalar | mijoz saqlab qolish, arzon |
| 3 | 22 SEO, 6 Qidiruv | organik trafik |
| 4 | 8 Telegram Mini App | O'zbekiston auditoriyasi |
| 5 | 11–13 Seller portal + payout | marketplace bo'lish (aks holda — bitta do'kon) |
| 6 | 7 Tavsiyalar, 23–25 Growth | o'rtacha chek va qaytish |
| 7 | 24 Loyalty, 26 Gift card, 27–28 texnik | masshtab |
