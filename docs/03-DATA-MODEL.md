# 03 — Ma'lumotlar modeli tuzatishlari (P1)

> Manba: `prisma/schema.prisma` (22 model). Har bir band: **Muammo → Yangi schema → Migratsiya eslatmasi**.
> Migratsiyalar `expand → migrate data → contract` tartibida, production'da ma'lumot yo'qotmasdan.

---

## D1. Order ↔ Product: noto'g'ri bog'lanish (KRITIK dizayn xatosi)

**Hozir.** `Product.orderId String?` + `Order.products Product[]` → bitta mahsulot **faqat bitta**
buyurtmada bo'la oladi; miqdor, narx snapshot'i yo'q.

**Kerak.**
```prisma
enum ORDER_STATUS { NEW CONFIRMED PACKED SHIPPED DELIVERED CANCELLED RETURNED }
enum PAYMENT_STATUS { PENDING PAID FAILED REFUNDED }

model Order {
  id            String         @id @default(uuid())
  number        Int            @default(autoincrement()) @unique // odam o'qiydigan raqam
  user          User           @relation(fields: [userId], references: [id])
  userId        String
  status        ORDER_STATUS   @default(NEW)
  paymentStatus PAYMENT_STATUS @default(PENDING)
  subtotal      Decimal        @db.Decimal(14, 2)
  discount      Decimal        @db.Decimal(14, 2) @default(0)
  deliveryFee   Decimal        @db.Decimal(14, 2) @default(0)
  total         Decimal        @db.Decimal(14, 2)
  currency      String         @default("UZS")
  promocodeId   String?
  addressJson   Json?          // snapshot — manzil keyin o'zgarsa buyurtma o'zgarmaydi
  comment       String?
  idempotencyKey String?       @unique
  items         OrderItem[]
  statusHistory OrderStatusHistory[]
  deletedAt     DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([userId, createdAt])
  @@index([status])
}

model OrderItem {
  id         String  @id @default(uuid())
  order      Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId    String
  product    Product @relation(fields: [productId], references: [id])
  productId  String
  variantId  String?
  nameUz     String  // snapshot
  nameRu     String
  unitPrice  Decimal @db.Decimal(14, 2) // snapshot
  quantity   Int
  lineTotal  Decimal @db.Decimal(14, 2)

  @@index([orderId])
  @@index([productId])
}

model OrderStatusHistory {
  id        String       @id @default(uuid())
  order     Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId   String
  from      ORDER_STATUS?
  to        ORDER_STATUS
  byUserId  String?
  note      String?
  createdAt DateTime     @default(now())
  @@index([orderId, createdAt])
}
```
`Product.orderId` / `Product.Order` — o'chiriladi.

---

## D2. Pul `Float` → `Decimal`

`Product.price`, `Product.discount`, `Promocode.discount`, `Promotion.discount` — `Float`.
`0.1 + 0.2 !== 0.3`. UZS'da tiyin ishlatilmaydi, lekin foiz chegirmalar kasr beradi.
```prisma
price    Decimal @db.Decimal(14, 2)
oldPrice Decimal? @db.Decimal(14, 2)   // "chegirmagacha" ko'rsatish uchun
```
Kod tomonida `Prisma.Decimal` (`decimal.js`); DTO'da `@IsNumberString()` yoki `number` + `@Transform`.
Chegirma turi: `discountType: PERCENT | FIXED` + `discountValue`.

---

## D3. Category: daraxt, unique slug, indeks

**Hozir.** `parentId String?` relation'siz, `slugUz/slugRu` unique emas, indeks yo'q.
```prisma
model Category {
  // ...
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  parentId String?
  children Category[] @relation("CategoryTree")
  path     String?    // "root-id/child-id" — subtree query uchun (ixtiyoriy, materialized path)
  depth    Int        @default(0)
  icon     String?
  image    String?

  @@unique([slugUz])
  @@unique([slugRu])
  @@index([parentId])
  @@index([active, deletedAt, position])
}
```
Servisda: o'zini o'ziga parent qilishni va siklni taqiqlash; soft delete'da bolalar bilan nima
bo'lishini hal qilish (bolalar ham `deletedAt`, yoki taqiqlash: `409 CATEGORY_HAS_CHILDREN`).

---

## D4. Product: to'liq katalog modeli

```prisma
model Product {
  id            String   @id @default(uuid())
  sku           String?  @unique
  slugUz        String   @unique
  slugRu        String   @unique
  nameUz        String
  nameRu        String
  descriptionUz String
  descriptionRu String
  price         Decimal  @db.Decimal(14, 2)
  oldPrice      Decimal? @db.Decimal(14, 2)
  stock         Int      @default(0)
  trackStock    Boolean  @default(true)
  images        String[]
  attributes    Json?    // { attributeId: optionId } — tez filter uchun; normalizatsiya: ProductAttributeValue
  ratingAvg     Decimal  @db.Decimal(3, 2) @default(0) // denormalizatsiya (Comment'dan)
  ratingCount   Int      @default(0)
  soldCount     Int      @default(0)
  viewCount     Int      @default(0)
  active        Boolean  @default(false)
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  category      Category @relation(fields: [categoryId], references: [id])
  categoryId    String
  brand         Brand?   @relation(fields: [brandId], references: [id])   // brand ixtiyoriy bo'lishi kerak
  brandId       String?
  store         Store    @relation(fields: [storeId], references: [id])
  storeId       String
  badges        ProductBadge[]
  variants      ProductVariant[]
  orderItems    OrderItem[]
  comments      Comment[]

  @@index([categoryId, active, deletedAt])
  @@index([storeId, active, deletedAt])
  @@index([brandId])
  @@index([price])
  @@index([createdAt])
}

model ProductVariant {          // Attribute/AttributeOption dan foydalanadi (o'lcham/rang)
  id        String  @id @default(uuid())
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId String
  sku       String? @unique
  optionIds String[] // AttributeOption id'lari
  price     Decimal? @db.Decimal(14, 2)
  stock     Int     @default(0)
  image     String?
  active    Boolean @default(true)
  @@index([productId])
}

model ProductBadge {            // Badge ↔ Product (hozir bog'lanish umuman yo'q)
  productId String
  badgeId   String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  badge     Badge   @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  @@id([productId, badgeId])
}
```
Full-text qidiruv uchun migratsiyada qo'lda: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` +
`CREATE INDEX product_name_trgm ON "Product" USING gin ("nameUz" gin_trgm_ops, "nameRu" gin_trgm_ops);`
(Prisma `@@index` bilan ifodalab bo'lmaydi — migratsiya SQL'iga qo'shiladi).

---

## D5. Store: egasi va unique `pagename`

```prisma
model Store {
  // ...
  pagename  String  @unique          // URL slug
  owner     User?   @relation("StoreOwner", fields: [ownerId], references: [id])
  ownerId   String?
  members   StoreMember[]            // seller jamoasi (ixtiyoriy, keyin)
  phone     String?
  rating    Decimal @db.Decimal(3, 2) @default(0)
  @@index([ownerId])
}
```
Bu multi-vendor (seller portal) uchun zamin — `05-CORE` §6 va `13-IDEAS`.

---

## D6. User: unique email, sana tipi, keraksiz maydonlar

| Hozir | Muammo | Kerak |
|---|---|---|
| `email String` + `@@index([email])` | `resendVerification`/`forgotPassword` `findFirst` — ikkita user bir email bilan bo'lsa noaniq | `@unique` (soft-deleted userlar uchun `deletedAt` bilan partial unique — migratsiyada SQL) |
| `birthday String` | `'01.11.1997'` — saralab/filtrlab bo'lmaydi | `DateTime?` (`@db.Date`) |
| `name String?` | ishlatilmaydi | o'chirish yoki `displayName` |
| `gender`, `birthday` majburiy | mijoz signup'ida to'siq | `GENDER?`, ixtiyoriy |
| `phone @unique` | OK | `@Matches(/^998\d{9}$/)` DTO'da |
| Addresses yo'q | checkout uchun kerak | `Address` modeli (`userId`, `label`, `city`, `street`, `lat/lng`, `isDefault`) |

Qo'shimcha: `lastLoginAt DateTime?`, `locale LOCALE @default(UZ)` (email/SMS tili uchun).

---

## D7. Role: kod va tizim rollari

```prisma
model Role {
  code        String   @unique   // 'SUPER_ADMIN' | 'ADMIN' | 'SELLER' | 'CUSTOMER'
  isSystem    Boolean  @default(false) // o'chirib bo'lmaydi
  // ...
}
```
`S1` (signup) `code: 'CUSTOMER'` ga tayanadi; seed `upsert` bilan idempotent bo'ladi.

---

## D8. Comment (sharh/baholash)

```prisma
model Comment {
  // ...
  rating     Int?      // REVIEW uchun 1..5, COMMENT uchun null
  parent     Comment?  @relation("Thread", fields: [parentId], references: [id])
  parentId   String?
  replies    Comment[] @relation("Thread")
  images     String[]
  isVerifiedPurchase Boolean @default(false)
  moderatedAt DateTime?
  moderatedById String?
  deletedAt  DateTime?

  @@unique([userId, productId, type]) // bitta user bitta mahsulotga bitta REVIEW
  @@index([productId, active, createdAt])
}
```
`Product.ratingAvg/ratingCount` — review yaratilganda/o'chirilganda qayta hisoblanadi (event orqali).

---

## D9. Promocode / Promotion

```prisma
model Promocode {
  code          String   @unique
  discountType  DISCOUNT_TYPE   // PERCENT | FIXED
  discountValue Decimal  @db.Decimal(14, 2)
  minOrderTotal Decimal? @db.Decimal(14, 2)
  maxDiscount   Decimal? @db.Decimal(14, 2)
  usageLimit    Int?
  usedCount     Int      @default(0)
  perUserLimit  Int      @default(1)
  scope         Json?    // { categoryIds, productIds, storeIds }
  // customerId/productId String → relation yoki scope ichiga
  usages        PromocodeUsage[]
}
model PromocodeUsage { promocodeId, userId, orderId, createdAt; @@unique([promocodeId, orderId]) }
```
`Promotion` — `scope` (kategoriya/brend/do'kon) + `priority`; narx hisoblash `PricingService` da.

---

## D10. Banner, Badge, Page — kichik qo'shimchalar

- `Banner`: `linkUrl`, `placement` (`HOME_TOP | HOME_MIDDLE | CATEGORY`), `startAt/endAt`, `position`.
- `Badge`: `code @unique`, `rule Json?` (DYNAMIC uchun: `{ type: 'NEW', days: 14 }`); `ProductBadge` (D4).
- `Page`: `slug @unique`, `seoTitleUz/Ru`, `seoDescriptionUz/Ru`, `publishedAt`.

---

## D11. Message: indeks va suhbat

```prisma
model Message {
  // ...
  readAt     DateTime?
  @@index([senderId, receiverId, createdAt])
  @@index([receiverId, readAt])
}
```
Kelajakda `Conversation` (`participantIds`, `lastMessageAt`, `orderId?`) — `13-IDEAS` §12.

---

## D12. Soft delete bir xil emas

`deletedAt` bor: User, Category, Product, Order, Brand, Store, Car. Yo'q: Banner, Badge, Page, Role, Comment, Message.
Qaror: **admin tahrirlaydigan barcha kontent modellarida** `deletedAt` bo'lsin (Banner, Badge, Page, Comment),
Role/Message/Token'lar — hard delete. Avtomatik filtr — Prisma client extension (`06-PERFORMANCE` §5).

---

## D13. Audit maydonlari

Barcha admin-CRUD modellariga `createdById String?`, `updatedById String?` — kim o'zgartirganini bilish.
To'liq audit log (`before/after`) — `13-IDEAS` §13 (`AuditLog` jadvali).

---

## D14. Tozalash

- `TestModal` — o'chirish.
- `Car` — o'chirish (demo).
- `ImageUpload`: `uploadedById String?`, `optimizedFileId/thumbnailFileId` (File'ga relation) — orphan tozalash uchun.
- `File`: `size Int`, `mimeType String`, `uploadedById`, `deletedAt`.
- `RefreshToken`/`VerificationToken`: `@@index([tokenHash])` dublikatini olib tashlash.

---

## Migratsiya rejasi

| Qadam | Nomi | Tarkib | Xavf |
|---|---|---|---|
| M1 | `cleanup_demo_models` | `TestModal`, `Car` drop; dublikat indekslar | Past |
| M2 | `role_code_and_customer` | `Role.code`, `isSystem`; seed `upsert` | Past |
| M3 | `category_tree_slugs` | self-relation, unique slug (avval dublikatlarni tekshirish: `SELECT slugUz, count(*) … HAVING count(*)>1`), indekslar | O'rta |
| M4 | `money_decimal` | `Float → Decimal` (`ALTER … TYPE numeric(14,2) USING price::numeric`) | O'rta |
| M5 | `order_items` | `OrderItem`, `OrderStatusHistory`, `Order` maydonlari; `Product.orderId` drop (avval mavjud `Order` yo'qligini tekshirish) | O'rta |
| M6 | `product_catalog` | D4 maydonlari, `ProductVariant`, `ProductBadge`, `pg_trgm` | O'rta |
| M7 | `store_owner`, `user_fields`, `comment_review`, `promo_v2`, `content_extras`, `soft_delete_unify`, `audit_fields` | qolganlari | Past |

Har migratsiyadan keyin: `pnpm prisma migrate dev --name <nom>` → `pnpm build` → `pnpm test:e2e`.
Production: `prisma migrate deploy` — `10-DEVOPS` §5.
