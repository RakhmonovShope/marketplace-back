# 02 — Ma'lumotlar modeli (Prisma)

> Bu fayl backend repo uchun. Schema bo'laklarga bo'lingan — ROADMAP'dagi qadamlar
> mos bo'lakni `prisma/schema.prisma` ga qo'shib boradi. Hammasini birdan yozmang.

## Umumiy konvensiyalar (buzilmaydi)

- ID: `String @id @default(uuid())`
- Audit: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Soft delete: `deletedAt DateTime?` (o'chirish o'rniga)
- Yoqish/o'chirish: `active Boolean @default(true)`
- Enum: `UPPER_SNAKE_CASE`
- Model nomi: `PascalCase`, birlikda
- Lokalizatsiya: har bir matnli maydon `...Uz` va `...Ru` (ADR-011)
- Pul: `Decimal @db.Decimal(14, 2)`, foiz: `Decimal @db.Decimal(6, 2)`
- **Float ishlatilmaydi** — foiz va pul uchun faqat `Decimal`

---

## 1-BO'LAK — Enumlar

```prisma
enum USER_TYPE          { ADMIN BUSINESS }
enum GENDER             { MALE FEMALE OTHER }
enum AUTH_PROVIDER      { PASSWORD TELEGRAM PHONE_OTP }
enum OTP_PURPOSE        { LOGIN REGISTER PHONE_VERIFY EMAIL_VERIFY }
enum OTP_CHANNEL_TYPE   { TELEGRAM EMAIL SMS CONSOLE }

enum PLATFORM           { INSTAGRAM TELEGRAM YOUTUBE TIKTOK FACEBOOK X THREADS LINKEDIN OTHER }
enum DATA_SOURCE        { MANUAL API IMPORT }
enum SYNC_STATUS        { NEVER PENDING SYNCING SUCCESS FAILED }

enum INFLUENCER_STATUS  { DRAFT PENDING_REVIEW PUBLISHED ARCHIVED }
enum INFLUENCER_TIER    { NANO MICRO MID MACRO MEGA }

enum AD_FORMAT          { POST STORY REEL VIDEO SHORT INTEGRATION MENTION REVIEW LIVE OTHER }

enum PLAN_CODE          { FREE PRO BUSINESS ENTERPRISE }
enum SUBSCRIPTION_STATUS{ TRIAL ACTIVE EXPIRED CANCELLED }

enum IMPORT_TYPE        { INFLUENCER SOCIAL_ACCOUNT STATS }
enum IMPORT_STATUS      { PENDING VALIDATING VALIDATED PROCESSING COMPLETED PARTIAL FAILED }

enum FEATURED_TYPE      { TOP_SEARCH CATEGORY_TOP DASHBOARD_RECOMMENDED VERIFIED_BADGE }
enum VIEW_SOURCE        { WEB MINIAPP ADMIN }
```

---

## 2-BO'LAK — Foydalanuvchi, rol, auth  (STEP-B-08)

```prisma
model User {
  id             String        @id @default(uuid())
  type           USER_TYPE     @default(BUSINESS)

  // identifikatorlar — hech biri majburiy emas, lekin kamida bittasi bo'lishi shart
  email          String?       @unique
  emailVerified  Boolean       @default(false)
  phone          String?       @unique
  phoneVerified  Boolean       @default(false)
  telegramId     String?       @unique
  telegramUsername String?
  password       String?       // faqat ADMIN uchun (bcrypt)

  firstName      String?
  lastName       String?
  avatarUrl      String?
  companyName    String?       // biznes foydalanuvchi
  languageCode   String        @default("uz")

  role           Role?         @relation(fields: [roleId], references: [id])
  roleId         String?

  active         Boolean       @default(true)
  blockedAt      DateTime?
  blockReason    String?
  lastLoginAt    DateTime?
  registeredFrom VIEW_SOURCE?  // qayerdan ro'yxatdan o'tgan

  deletedAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  refreshTokens  RefreshToken[]
  otpCodes       OtpCode[]
  favorites      Favorite[]
  comparisons    Comparison[]
  savedSearches  SavedSearch[]
  subscriptions  Subscription[]
  profileViews   ProfileView[]
  searchLogs     SearchLog[]
  importJobs     ImportJob[]
  ownedInfluencers Influencer[] @relation("InfluencerOwner")

  @@index([type, active])
  @@index([createdAt])
}

model Role {
  id          String   @id @default(uuid())
  code        String   @unique          // SUPER_ADMIN, ADMIN, MODERATOR, CONTENT_MANAGER
  nameUz      String
  nameRu      String
  permissions String[]                  // PERMISSIONS enum qiymatlari
  isSystem    Boolean  @default(false)  // o'chirib bo'lmaydi
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]
}

model RefreshToken {
  id         String    @id @default(uuid())
  tokenHash  String    @unique
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  userAgent  String?
  ip         String?
  expiresAt  DateTime
  revokedAt  DateTime?
  replacedBy String?                    // rotatsiya zanjiri
  createdAt  DateTime  @default(now())

  @@index([userId, revokedAt])
}

model OtpCode {
  id         String       @id @default(uuid())
  target     String                      // telefon yoki email
  codeHash   String                      // bcrypt — ochiq kod SAQLANMAYDI
  purpose    OTP_PURPOSE
  channel    OTP_CHANNEL_TYPE
  attempts   Int          @default(0)
  maxAttempts Int         @default(5)
  consumedAt DateTime?
  expiresAt  DateTime
  user       User?        @relation(fields: [userId], references: [id])
  userId     String?
  createdAt  DateTime     @default(now())

  @@index([target, purpose, consumedAt])
  @@index([expiresAt])
}
```

> **⏸ MVP-KEYIN (ADR-013):** `OtpCode` jadvali va `User.otpCodes` relatsiyasi MVP
> migratsiyasiga KIRITILMAYDI — web kirish Telegram Login Widget orqali. SMS/OTP
> kanali qo'shilganda alohida migratsiya bilan qaytadi (o'shanda `OtpCode.id` bot
> deep link payload sifatida ishlatiladi: `t.me/<bot>?start=otp_<id>`).

---

## 3-BO'LAK — Ma'lumotnomalar va kategoriyalar  (STEP-B-20, B-21)

```prisma
model Country {
  id        String   @id @default(uuid())
  code      String   @unique            // ISO: UZ, KZ, RU
  nameUz    String
  nameRu    String
  flagEmoji String?
  position  Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  cities    City[]
  influencers Influencer[]
}

model City {
  id        String   @id @default(uuid())
  country   Country  @relation(fields: [countryId], references: [id])
  countryId String
  nameUz    String
  nameRu    String
  position  Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  influencers Influencer[]

  @@index([countryId, active])
}

model Language {
  id        String   @id @default(uuid())
  code      String   @unique            // uz, ru, en, kaa
  nameUz    String
  nameRu    String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  influencers InfluencerLanguage[]
}

model Category {
  id            String     @id @default(uuid())
  parent        Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  parentId      String?
  children      Category[] @relation("CategoryTree")

  nameUz        String
  nameRu        String
  descriptionUz String?
  descriptionRu String?
  slug          String     @unique
  icon          String?                 // emoji yoki icon nomi
  coverUrl      String?
  position      Int        @default(0)
  isPopular     Boolean    @default(false)   // dashboard'da ko'rsatiladi

  influencerCount Int      @default(0)       // denormalizatsiya — cron yangilaydi

  active        Boolean    @default(true)
  deletedAt     DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  influencers   InfluencerCategory[]

  @@index([parentId, active, position])
  @@index([slug])
}
```

> Kategoriya daraxti 2 darajali: `Food` -> `Food blogger`, `Restoran sharhlovchi`, `Oshpaz`.
> Kod 3+ darajani ham qo'llab-quvvatlaydi, lekin UI 2 daraja uchun mo'ljallangan.

---

## 4-BO'LAK — Influencer yadrosi  (STEP-B-22, B-23)

```prisma
model Influencer {
  id             String            @id @default(uuid())

  // --- asosiy ---
  fullName       String
  slug           String            @unique          // SEO uchun: /influencer/aziz-food
  avatarUrl      String?
  coverUrl       String?
  bioUz          String?
  bioRu          String?
  gender         GENDER?
  birthYear      Int?

  country        Country?          @relation(fields: [countryId], references: [id])
  countryId      String?
  city           City?             @relation(fields: [cityId], references: [id])
  cityId         String?

  // --- aloqa ---
  contactEmail   String?
  contactPhone   String?
  contactTelegram String?
  managerName    String?
  managerPhone   String?

  // --- status ---
  status         INFLUENCER_STATUS @default(DRAFT)
  isVerified     Boolean           @default(false)   // tasdiqlangan profil
  verifiedAt     DateTime?
  isFeatured     Boolean           @default(false)   // pullik joylashtirish
  featuredUntil  DateTime?

  // --- kelajakda: influencer o'z profilini claim qiladi ---
  owner          User?             @relation("InfluencerOwner", fields: [ownerUserId], references: [id])
  ownerUserId    String?

  // --- AGGREGATLAR (denormalizatsiya, ADR-007) ---
  // Bu maydonlarni FAQAT InfluencerAggregateService yozadi
  totalFollowers    Int             @default(0)
  maxEngagementRate Decimal         @default(0) @db.Decimal(6, 2)
  avgViews          Int             @default(0)
  growthRate30d     Decimal         @default(0) @db.Decimal(6, 2)
  primaryPlatform   PLATFORM?
  tier              INFLUENCER_TIER?
  popularityScore   Decimal         @default(0) @db.Decimal(10, 4)
  minPrice          Decimal?        @db.Decimal(14, 2)
  socialCount       Int             @default(0)
  statsUpdatedAt    DateTime?

  // --- metrikalar ---
  viewCount      Int               @default(0)
  favoriteCount  Int               @default(0)

  active         Boolean           @default(true)
  deletedAt      DateTime?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  categories     InfluencerCategory[]
  languages      InfluencerLanguage[]
  socialAccounts SocialAccount[]
  prices         InfluencerPrice[]
  favorites      Favorite[]
  profileViews   ProfileView[]
  featured       FeaturedPlacement[]
  comparisonItems ComparisonItem[]

  // --- qidiruv indekslari (ADR-007) ---
  @@index([status, active, popularityScore(sort: Desc)])
  @@index([status, active, totalFollowers(sort: Desc)])
  @@index([status, active, maxEngagementRate(sort: Desc)])
  @@index([status, active, growthRate30d(sort: Desc)])
  @@index([status, active, createdAt(sort: Desc)])
  @@index([isFeatured, featuredUntil])
  @@index([countryId, cityId])
  @@index([tier])
  @@index([slug])
}

model InfluencerCategory {
  influencer   Influencer @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  influencerId String
  category     Category   @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  categoryId   String
  isPrimary    Boolean    @default(false)
  createdAt    DateTime   @default(now())

  @@id([influencerId, categoryId])
  @@index([categoryId, isPrimary])
}

model InfluencerLanguage {
  influencer   Influencer @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  influencerId String
  language     Language   @relation(fields: [languageId], references: [id], onDelete: Cascade)
  languageId   String

  @@id([influencerId, languageId])
  @@index([languageId])
}

model InfluencerPrice {
  id           String     @id @default(uuid())
  influencer   Influencer @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  influencerId String
  platform     PLATFORM
  format       AD_FORMAT
  price        Decimal    @db.Decimal(14, 2)
  currency     String     @default("UZS")
  negotiable   Boolean    @default(false)
  noteUz       String?
  noteRu       String?
  active       Boolean    @default(true)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([influencerId, platform, format])
  @@index([price])
}
```

---

## 5-BO'LAK — Ijtimoiy tarmoq va statistika  (STEP-B-24, B-27)

```prisma
model SocialAccount {
  id           String       @id @default(uuid())
  influencer   Influencer   @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  influencerId String

  platform     PLATFORM
  username     String                      // @ belgisisiz
  url          String
  externalId   String?                     // channelId, chatId — provayder uchun
  isPrimary    Boolean      @default(false)

  // --- ma'lumot manbai boshqaruvi (ADR-005) ---
  dataSource   DATA_SOURCE  @default(MANUAL)
  manualLock   Boolean      @default(false) // true bo'lsa API qayta yozmaydi
  manualFields String[]     @default([])    // qaysi maydonlar qo'lda kiritilgan
  syncStatus   SYNC_STATUS  @default(NEVER)
  lastSyncedAt DateTime?
  syncError    String?
  syncProvider String?                      // 'youtube-data-api', 'tgstat', ...

  active       Boolean      @default(true)
  deletedAt    DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  stats        SocialAccountStats?
  snapshots    SocialAccountSnapshot[]
  posts        SocialPost[]
  demographics AudienceDemographics?
  syncLogs     SyncLog[]

  @@unique([influencerId, platform, username])
  @@index([platform, syncStatus])
  @@index([influencerId, isPrimary])
}

/// Joriy holat — tez o'qish uchun (1:1)
model SocialAccountStats {
  id              String        @id @default(uuid())
  account         SocialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  accountId       String        @unique

  followers       Int           @default(0)
  following       Int           @default(0)
  postsCount      Int           @default(0)

  avgLikes        Int           @default(0)
  avgComments     Int           @default(0)
  avgViews        Int           @default(0)
  avgShares       Int           @default(0)

  engagementRate  Decimal       @default(0) @db.Decimal(6, 2)
  viewRate        Decimal       @default(0) @db.Decimal(6, 2)  // avgViews/followers
  postFrequency   Decimal       @default(0) @db.Decimal(6, 2)  // post/kun

  growth7d        Decimal       @default(0) @db.Decimal(6, 2)
  growth30d       Decimal       @default(0) @db.Decimal(6, 2)
  growth90d       Decimal       @default(0) @db.Decimal(6, 2)

  source          DATA_SOURCE   @default(MANUAL)
  measuredAt      DateTime      @default(now())
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

/// Tarixiy nuqtalar — o'sish grafigi uchun (ADR-006)
model SocialAccountSnapshot {
  id             String        @id @default(uuid())
  account        SocialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  accountId      String
  capturedAt     DateTime      @db.Date        // KUN aniqligida

  followers      Int
  avgLikes       Int           @default(0)
  avgComments    Int           @default(0)
  avgViews       Int           @default(0)
  postsCount     Int           @default(0)
  engagementRate Decimal       @default(0) @db.Decimal(6, 2)

  source         DATA_SOURCE   @default(MANUAL)
  createdAt      DateTime      @default(now())

  @@unique([accountId, capturedAt])
  @@index([accountId, capturedAt(sort: Desc)])
}

/// Eng yaxshi ishlagan postlar
model SocialPost {
  id           String        @id @default(uuid())
  account      SocialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  accountId    String
  externalId   String
  url          String
  thumbnailUrl String?
  caption      String?
  likes        Int           @default(0)
  comments     Int           @default(0)
  views        Int           @default(0)
  shares       Int           @default(0)
  engagementRate Decimal     @default(0) @db.Decimal(6, 2)
  publishedAt  DateTime?
  source       DATA_SOURCE   @default(API)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([accountId, externalId])
  @@index([accountId, engagementRate(sort: Desc)])
}

/// Phase 2 — auditoriya tahlili
model AudienceDemographics {
  id          String        @id @default(uuid())
  account     SocialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  accountId   String        @unique
  malePercent   Decimal?    @db.Decimal(5, 2)
  femalePercent Decimal?    @db.Decimal(5, 2)
  ageGroups     Json?       // { "13-17": 5.2, "18-24": 34.1, ... }
  topCountries  Json?       // [{ code: "UZ", percent: 78.4 }, ...]
  topCities     Json?
  source        DATA_SOURCE @default(API)
  measuredAt    DateTime    @default(now())
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

---

## 6-BO'LAK — Sinxronizatsiya va import  (STEP-B-35, B-36)

```prisma
model SyncLog {
  id          String        @id @default(uuid())
  account     SocialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  accountId   String
  provider    String
  status      SYNC_STATUS
  startedAt   DateTime      @default(now())
  finishedAt  DateTime?
  durationMs  Int?
  error       String?
  rawPayload  Json?                        // debug uchun, 30 kundan keyin cron o'chiradi
  changedFields String[]    @default([])
  createdAt   DateTime      @default(now())

  @@index([accountId, createdAt(sort: Desc)])
  @@index([status, createdAt])
}

model ImportJob {
  id            String        @id @default(uuid())
  type          IMPORT_TYPE
  status        IMPORT_STATUS @default(PENDING)
  fileName      String
  fileUrl       String
  totalRows     Int           @default(0)
  validRows     Int           @default(0)
  errorRows     Int           @default(0)
  processedRows Int           @default(0)
  createdRows   Int           @default(0)
  updatedRows   Int           @default(0)
  errors        Json?         // [{ row: 12, field: 'followers', message: '...' }]
  preview       Json?         // dry-run natijasi (birinchi 20 qator)
  dryRun        Boolean       @default(true)
  createdBy     User          @relation(fields: [createdById], references: [id])
  createdById   String
  startedAt     DateTime?
  finishedAt    DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([status, createdAt(sort: Desc)])
}
```

### Import oqimi (ikki bosqichli — majburiy)
```
1. POST /admin/imports          fayl yuklanadi  -> status=VALIDATING (dryRun=true)
2. Worker: parse + validate     -> status=VALIDATED, preview va errors to'ldiriladi
3. Admin preview'ni ko'radi
4. POST /admin/imports/:id/apply -> status=PROCESSING -> COMPLETED | PARTIAL
```
Bir bosqichli import (yuklash = darhol yozish) **taqiqlanadi** — noto'g'ri fayl
bazani buzadi.

---

## 7-BO'LAK — Foydalanuvchi harakatlari  (STEP-B-40 … B-43)

```prisma
model Favorite {
  id           String     @id @default(uuid())
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  influencer   Influencer @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  influencerId String
  note         String?
  createdAt    DateTime   @default(now())

  @@unique([userId, influencerId])
  @@index([userId, createdAt(sort: Desc)])
}

model Comparison {
  id        String           @id @default(uuid())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  name      String?
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  items     ComparisonItem[]

  @@index([userId, createdAt(sort: Desc)])
}

model ComparisonItem {
  comparison   Comparison @relation(fields: [comparisonId], references: [id], onDelete: Cascade)
  comparisonId String
  influencer   Influencer @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  influencerId String
  position     Int        @default(0)

  @@id([comparisonId, influencerId])
}

model SavedSearch {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  name      String
  filters   Json                    // InfluencerSearchDto ko'rinishida (ADR-014)
  notifyNew Boolean  @default(false) // Phase 2: yangi mos influencer chiqsa xabar
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model ProfileView {
  id           String      @id @default(uuid())
  influencer   Influencer  @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  influencerId String
  user         User?       @relation(fields: [userId], references: [id])
  userId       String?
  source       VIEW_SOURCE @default(WEB)
  ip           String?
  createdAt    DateTime    @default(now())

  @@index([influencerId, createdAt(sort: Desc)])
  @@index([createdAt])
}

model SearchLog {
  id          String   @id @default(uuid())
  user        User?    @relation(fields: [userId], references: [id])
  userId      String?
  query       String?
  filters     Json?
  resultCount Int      @default(0)
  source      VIEW_SOURCE @default(WEB)
  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@index([query])
}
```

---

## 8-BO'LAK — Monetizatsiya (schema bor, gating o'chiq — ADR-008)  (STEP-B-44)

```prisma
model Plan {
  id            String    @id @default(uuid())
  code          PLAN_CODE @unique
  nameUz        String
  nameRu        String
  descriptionUz String?
  descriptionRu String?
  monthlyPrice  Decimal   @default(0) @db.Decimal(14, 2)
  yearlyPrice   Decimal   @default(0) @db.Decimal(14, 2)
  currency      String    @default("UZS")

  // limitlar — FEATURE_GATING_ENABLED=true bo'lganda ishlaydi
  searchesPerDay      Int?     // null = cheksiz
  profileViewsPerDay  Int?
  comparisonSlots     Int      @default(2)
  savedSearchLimit    Int      @default(3)
  favoriteLimit       Int?
  canExport           Boolean  @default(false)
  canSeeFullAnalytics Boolean  @default(false)
  canSeeContacts      Boolean  @default(false)
  canSeeGrowthChart   Boolean  @default(false)

  position      Int       @default(0)
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  subscriptions Subscription[]
}

model Subscription {
  id        String              @id @default(uuid())
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  plan      Plan                @relation(fields: [planId], references: [id])
  planId    String
  status    SUBSCRIPTION_STATUS @default(ACTIVE)
  startedAt DateTime            @default(now())
  expiresAt DateTime?
  cancelledAt DateTime?
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  @@index([userId, status])
  @@index([expiresAt])
}

model FeaturedPlacement {
  id           String        @id @default(uuid())
  influencer   Influencer    @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  influencerId String
  type         FEATURED_TYPE
  categoryId   String?                    // CATEGORY_TOP uchun
  position     Int           @default(0)
  startsAt     DateTime
  endsAt       DateTime
  price        Decimal?      @db.Decimal(14, 2)
  active       Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([type, active, startsAt, endsAt])
}
```

---

## 9-BO'LAK — Infratuzilma  (STEP-B-19, B-48)

```prisma
model File {
  id           String   @id @default(uuid())
  name         String
  originalName String
  url          String   @unique
  mimeType     String
  size         Int
  width        Int?
  height       Int?
  variants     Json?    // { thumb: '...', medium: '...', large: '...' }
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Banner {
  id          String   @id @default(uuid())
  titleUz     String
  titleRu     String
  imageUrlUz  String
  imageUrlRu  String
  link        String?
  position    Int      @default(0)
  placement   String   @default("DASHBOARD")   // DASHBOARD | CATALOG | MINIAPP_HOME
  startsAt    DateTime?
  endsAt      DateTime?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([placement, active, position])
}

model Page {
  id        String   @id @default(uuid())
  slug      String   @unique          // about, terms, privacy, faq
  titleUz   String
  titleRu   String
  contentUz String
  contentRu String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Setting {
  id        String   @id @default(uuid())
  key       String   @unique          // popularity.weight.followers
  value     Json
  group     String   @default("general")
  descriptionUz String?
  descriptionRu String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([group])
}
```

---

## Migratsiya tartibi

| Migratsiya nomi | Bo'lak | Qadam |
|---|---|---|
| `init_auth` | 1, 2 | B-08 |
| `add_reference_and_category` | 3 | B-20, B-21 |
| `add_influencer_core` | 4 | B-22 |
| `add_social_and_stats` | 5 | B-24 |
| `add_sync_and_import` | 6 | B-31, B-36 |
| `add_user_actions` | 7 | B-40 |
| `add_monetization` | 8 | B-44 |
| `add_infrastructure` | 9 | B-19, B-48 |

## Qo'shimcha SQL (migratsiya ichida qo'lda qo'shiladi)

```sql
-- pg_trgm: nomlar bo'yicha fuzzy qidiruv (B-37)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX influencer_fullname_trgm ON "Influencer" USING gin ("fullName" gin_trgm_ops);
CREATE INDEX social_username_trgm ON "SocialAccount" USING gin ("username" gin_trgm_ops);

-- faqat nashr qilingan influencerlar uchun qisman indeks
CREATE INDEX influencer_published_score
  ON "Influencer" ("popularityScore" DESC)
  WHERE "status" = 'PUBLISHED' AND "active" = true AND "deletedAt" IS NULL;
```

## Seed ma'lumotlari (STEP-B-09)

1. **Rollar:** `SUPER_ADMIN` (barcha permission), `ADMIN`, `CONTENT_MANAGER` (influencer CRUD), `MODERATOR` (faqat ko'rish + tasdiqlash)
2. **Super admin:** `.env` dagi `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
3. **Planlar:** FREE, PRO, BUSINESS, ENTERPRISE
4. **Davlatlar:** UZ, KZ, KG, TJ, RU + O'zbekiston shaharlari (14 viloyat markazi)
5. **Tillar:** uz, ru, en, kaa
6. **Kategoriyalar:** loyiha tavsifidagi 15 ta asosiy kategoriya + subkategoriyalar:

```
🍔 Oziq-ovqat / Food     -> Food blogger, Restoran sharhlovchi, Oshpaz, Cooking blogger
👗 Moda / Fashion        -> Fashion blogger, Model, Style blogger
💄 Go'zallik / Beauty    -> Makeup artist, Beauty blogger, Skincare
✈️ Sayohat / Travel      -> Sayohat blogeri, Turizm
💻 Texnologiya           -> Tech reviewer, Gadget, IT
🏋️ Sport va Fitness      -> Fitness trainer, Sport blogger
💼 Biznes va Moliya      -> Biznes, Investitsiya, Marketing
🎬 Ko'ngilochar          -> Yumor, Skitch, Vlog
🎵 Musiqa                -> Xonanda, Musiqachi, DJ
⚽ Sportchilar
🎭 Aktyorlar
📱 Lifestyle
👨‍👩‍👧 Oila va bolalar
🚗 Avtomobillar
🏠 Uy va interyer
```
7. **Sozlamalar:** popularityScore koeffitsientlari
