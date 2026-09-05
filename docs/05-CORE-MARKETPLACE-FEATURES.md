# 05 — Marketplace yadrosi: yetishmayotgan featurelar (P1)

> Bu hujjat loyihani "admin CRUD to'plami"dan **ishlaydigan marketplace**ga aylantiradigan
> modullarni tartib bilan beradi. Har modul `AGENTS.md` §4 tuzilmasida (5 fayl + `*.query.ts`).
> Schema — `03-DATA-MODEL.md`. Tartib bog'liqlik bo'yicha: keyingisi oldingisisiz ishlamaydi.

```
Product ─► Public Catalog ─► Customer Auth ─► Cart ─► Checkout/Order ─► Payment
                 │                                        │
              Search                                Notifications
                 │                                        │
              Reviews ◄──────────────────────────── Promo engine
```

---

## 1. Product moduli (admin) — `src/api/product/`

**Endpointlar** (`/v1/admin/products`): pageable (filter: `categoryId`, `storeId`, `brandId`, `active`, `price between`,
`stock lte`; search: nomlar, sku), `GET :id` (variants, badges, category, brand, store bilan), `POST`, `PUT`,
`PATCH :id` (qisman: `active`, `stock`, `price`), `DELETE`, `PATCH :id/restore`, `POST bulk`.

**Biznes qoidalar (servisda, controller'da emas):**
- `slugUz/Ru` bo'sh bo'lsa nomdan generatsiya (`slugify` + unikal suffiks).
- `categoryId` faol va o'chirilmagan bo'lishi; `storeId` faol bo'lishi.
- `images` — faqat `/files/...` URL'lar (mavjudligini `File` jadvalidan tekshirish).
- `oldPrice < price` bo'lsa 400.
- Yaratilganda/yangilanganda `product.changed` event → cache invalidatsiya (`06-PERF` §3), qidiruv indeksi.

**Attribute / AttributeOption** — mavjud modellarga modul (`/v1/admin/attributes`, nested options).
Kategoriyaga biriktirilgan atributlar → mahsulot formasi shu atributlarni ko'rsatadi.

---

## 2. Mijoz auth — `src/api/auth/` kengaytmasi

Admin: telefon + parol (hozirgi). **Mijoz uchun parol so'rash — konversiyani o'ldiradi.**

| Kanal | Qanday | Holat |
|---|---|---|
| Telefon + OTP (SMS) | Eskiz.uz / Play Mobile provayderi, `OtpChannel` interfeysi (influencer loyihasidagi dizayn) | MVP |
| Telegram Login Widget / Mini App `initData` | HMAC tekshiruv, `telegramId` bilan upsert | MVP (arzon, O'zbekistonda eng qulay) |
| Email + parol | Mavjud | Admin uchun qoladi |

Modellar: `OtpCode { phone, codeHash, expiresAt, attempts, usedAt }`, `User.telegramId @unique`.
Cheklovlar: 1 telefon/daqiqa, 5 urinish/kod, kodlar Redis'da TTL bilan ham bo'lishi mumkin.
`ConsoleOtpChannel` — dev'da kod logga chiqadi (`MAIL_TRANSPORT=console` bilan bir xil g'oya).

---

## 3. Public katalog — `src/api/app/catalog/`

Guard: `OptionalJwtAuthGuard` (token bo'lsa user, bo'lmasa mehmon). Barcha javoblar `lang` bo'yicha `name` bilan (04 §5).

| Endpoint | Izoh | Cache |
|---|---|---|
| `GET /v1/app/categories/tree` | faol kategoriyalar daraxti | Redis 10 min, `category.changed` da invalidatsiya |
| `GET /v1/app/categories/:slug` | kategoriya + atributlar (filter paneli uchun) | 10 min |
| `POST /v1/app/products/search` | **typed DTO**: `categoryId`, `priceMin/Max`, `brandIds[]`, `storeIds[]`, `attrs: {attrId: optionIds[]}`, `inStock`, `sort: popular|new|priceAsc|priceDesc|rating`, `q` | 60 s, kalit = DTO hash |
| `GET /v1/app/products/:slug` | mahsulot + variantlar + badge'lar + `similar` (shu kategoriya, ±30% narx) | 5 min |
| `GET /v1/app/products/suggest?q=` | pg_trgm bo'yicha 10 ta nom | 60 s |
| `GET /v1/app/brands`, `/stores/:pagename` | | 10 min |
| `GET /v1/app/banners?placement=` | faol, `startAt<=now<=endAt` | 5 min |
| `GET /v1/app/pages/:slug` | CMS | 10 min |
| `GET /v1/app/home` | bitta so'rovda: bannerlar + top kategoriyalar + yangi/chegirmali/top mahsulotlar | 2 min |

`viewCount` — Redis `INCR` + har 5 daqiqada DB'ga flush (har ko'rishda `UPDATE` emas).

---

## 4. Cart — `src/api/app/cart/`

**Saqlash:** server-side, `Cart { userId?, sessionId?, items[] }` jadvalda (Redis emas — buyurtmaga aylanadi, tahlil kerak).
Mehmon savati: `X-Cart-Session` header (UUID, frontend cookie'da), login bo'lganda **merge**.

Endpointlar: `GET /v1/app/cart`, `POST items` (`productId`, `variantId?`, `qty`), `PATCH items/:id`, `DELETE items/:id`,
`POST promocode`, `DELETE promocode`. Har javobda hisob: `subtotal`, `discount`, `deliveryFee`, `total`, `warnings[]`
(`OUT_OF_STOCK`, `PRICE_CHANGED` — savatga qo'shilgandagi narx snapshot bilan solishtiriladi).

Narx hisoblash — **bitta joyda**: `PricingService.quote(items, promocode?, deliveryZone?)`. Cart ham, Checkout ham shuni chaqiradi.

---

## 5. Checkout va Order — `src/api/app/orders/` + `src/api/admin/orders/`

**Yaratish** (`POST /v1/app/orders`, `Idempotency-Key`):
```
$transaction(SERIALIZABLE yoki SELECT … FOR UPDATE):
  1. Savat qatorlarini qulflab o'qish
  2. Har mahsulot: active, stock >= qty (trackStock bo'lsa) → aks holda 409 OUT_OF_STOCK
  3. PricingService.quote → snapshot
  4. Order + OrderItem (nom/narx snapshot) + OrderStatusHistory(NEW)
  5. stock -= qty; soldCount += qty
  6. Promocode usedCount++, PromocodeUsage
  7. Savatni tozalash
emit('order.created') → notification queue, analytics
```
**Status mashinasi** (`OrderStateMachine`): `NEW→CONFIRMED→PACKED→SHIPPED→DELIVERED`; `NEW/CONFIRMED→CANCELLED`
(stock qaytadi); `DELIVERED→RETURNED`. Noto'g'ri o'tish → 409 `INVALID_TRANSITION`. Har o'tish `OrderStatusHistory` + event.

Mijoz: `GET /v1/app/orders`, `GET :id`, `POST :id/cancel` (faqat NEW/CONFIRMED). Admin: pageable (status, sana, do'kon),
`PATCH :id/status`, `GET :id` (to'liq), eksport CSV.

---

## 6. Payment — `src/api/payment/`

`PaymentProvider` interfeysi: `createInvoice(order)`, `handleWebhook(raw)`, `refund(payment, amount)`.
Adapterlar: **Payme** (Merchant API, JSON-RPC, `Basic` auth tekshiruv), **Click** (prepare/complete, `sign_string` MD5),
**Uzum Bank** (keyin), `CashOnDelivery` (adapter'siz). `Payment { orderId, provider, providerTxId, amount, status, rawPayload }`.

Qoidalar: webhook idempotent (`providerTxId @unique`), summa buyurtma `total` ga teng, holat o'tishlari faqat
`PENDING→PAID/FAILED`, `PAID→REFUNDED`. `order.paid` event → status `CONFIRMED`.
Webhook route'lari `@SkipThrottle()`, IP whitelist (Payme/Click IP'lari env'da), raw body kerak (`rawBody: true` Nest'da).

---

## 7. Reviews — `src/api/app/reviews/` + admin moderatsiya

`POST /v1/app/products/:id/reviews` — faqat `DELIVERED` buyurtmasi bor foydalanuvchi (`isVerifiedPurchase`),
bitta mahsulotga bitta review (`@@unique`). Yaratilganda `active=false` (moderatsiya), admin `PATCH approve/reject`.
`review.approved` event → `Product.ratingAvg/ratingCount` qayta hisob (`AVG`, `COUNT` bitta so'rovda).
Rasm qo'shish — `ImageUpload` orqali.

---

## 8. Promo engine — `src/api/promo/`

- `Promotion` (avtomatik chegirma, scope: kategoriya/brend/do'kon/mahsulot, `priority`, muddat).
- `Promocode` (qo'lda kiritiladigan, D9 cheklovlari).
- `PricingService` tartibi: mahsulot `oldPrice/price` → eng yaxshi bitta `Promotion` → `Promocode` (agar `scope` mos bo'lsa) → yetkazib berish.
- Badge DYNAMIC qoidalari cron bilan: `NEW` (14 kun), `BESTSELLER` (30 kunlik top-N), `SALE` (`oldPrice` bor).

---

## 9. Notifications — `src/api/notification/`

BullMQ `notification` navbati; kanallar: Telegram bot (mijoz `telegramId` bo'lsa), SMS (Eskiz), email, admin panel (WS).
Event → shablon (`order.created.uz.hbs`) → kanal. `Notification` jadvali (in-app ro'yxat, `readAt`).
Triggerlar: `order.created/paid/status_changed`, `review.approved`, `stock.low` (admin).

---

## 10. Admin dashboard — `src/api/admin/analytics/`

`GET /v1/admin/analytics/summary?from&to`: buyurtmalar soni/summasi kunlik, top-10 mahsulot, top kategoriya,
yangi mijozlar, o'rtacha chek, bekor qilish foizi, kam qolgan mahsulotlar. Hisob: Postgres aggregate + Redis 5 min cache;
> 100k buyurtmada — kunlik `DailySalesStat` jadvali (cron 00:05).

---

## 11. Bog'liqliklar jadvali

| Modul | Talab qiladi |
|---|---|
| Product | D2, D4 migratsiyalari, Pageable v2 |
| Public Catalog | Product, i18n middleware, Redis cache helper |
| Customer Auth | D6, D7, OtpChannel/Telegram |
| Cart | Product, Customer Auth (mehmon uchun sessionId), PricingService |
| Order | Cart, D1, Idempotency, StateMachine |
| Payment | Order, raw body, provider kalitlari |
| Reviews | Order (DELIVERED), D8 |
| Promo | D9, PricingService |
| Notifications | BullMQ (bor), Telegram bot token, Eskiz kaliti |

Har modul uchun `ROADMAP.md` da alohida qadam va DoD bor (STEP-30 … STEP-42).
