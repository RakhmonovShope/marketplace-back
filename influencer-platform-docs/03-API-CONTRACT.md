# 03 — API kontrakti

Base URL: `https://api.<domain>/api/v1`

Swagger UI: `/api/docs` — o'ng yuqoridagi **Select a definition** dropdown orqali
`1. Admin API`, `2. Web API`, `3. Mini App API` tanlanadi (ADR-009).

Umumiy header'lar:
```
Authorization: Bearer <accessToken>
Accept-Language: uz | ru          # javobdagi Uz/Ru maydonlarni tanlaydi
X-Client: web | miniapp | admin   # analitika uchun
```

---

## 1. Auth — `/auth/**`

| Metod | Path | Audience | Body | Javob |
|---|---|---|---|---|
| POST | `/auth/admin/login` | admin | `{email, password}` | `{accessToken, refreshToken, user}` |
| POST | `/auth/web/telegram` | web | Login Widget payload `{id, first_name, username?, photo_url?, auth_date, hash}` | `{accessToken, refreshToken, user, isNew}` |
| POST | `/auth/web/otp/request` ⏸ | web | `{phone}` — MVP-keyin (ADR-013) | `{sent, channel, expiresIn}` |
| POST | `/auth/web/otp/verify` ⏸ | web | `{phone, code}` — MVP-keyin | `{accessToken, refreshToken, user, isNew}` |
| POST | `/auth/telegram/init` | miniapp | `{initData}` | `{accessToken, refreshToken, user, needsPhone}` |
| POST | `/auth/telegram/bind-phone` | miniapp | `{initData, contact}` — `contact` = `requestContactComplete().raw` (Telegram imzoli query string; B2-02) | `{user}` |
| POST | `/auth/refresh` | hammasi | `{refreshToken}` | `{accessToken, refreshToken}` |
| POST | `/auth/logout` | hammasi | `{refreshToken}` | `{success}` |
| GET | `/auth/me` | hammasi | — | `{user, plan, permissions}` |
| PUT | `/auth/me` | web, miniapp | `{firstName, lastName, companyName, languageCode}` | `{user}` |

`GET /auth/me` javobi:
```json
{
  "user": { "id": "...", "type": "BUSINESS", "phone": "+998...", "firstName": "...",
            "avatarUrl": "...", "languageCode": "uz" },
  "plan": { "code": "FREE", "canSeeFullAnalytics": false, "comparisonSlots": 2 },
  "permissions": []
}
```

---

## 2. Public — `/public/**` (auth kerak emas, SEO uchun)

| Metod | Path | Izoh |
|---|---|---|
| GET | `/public/influencers/:slug` | Profil — cheklangan ma'lumot (SSR/SEO uchun) |
| GET | `/public/categories` | Kategoriya daraxti |
| GET | `/public/pages/:slug` | Statik sahifa (about, terms, privacy) |
| GET | `/public/sitemap` | Sitemap uchun slug ro'yxati |
| GET | `/public/stats` | Platforma statistikasi (influencerlar soni, kategoriyalar) |

---

## 3. App — `/app/**` (web + mini app uchun umumiy)

### 3.1 Dashboard
| Metod | Path | Javob |
|---|---|---|
| GET | `/app/dashboard` | Barcha bloklar bitta so'rovda |

```json
{
  "stats": { "influencers": 1240, "categories": 15, "totalReach": 48200000 },
  "banners": [...],
  "recommended":  { "title": "Tavsiya etilgan", "items": [...] },
  "topPopular":   { "title": "Eng mashhur", "items": [...] },
  "trending":     { "title": "Trending", "items": [...] },
  "fastestGrowing":{ "title": "Eng tez o'sayotgan", "items": [...] },
  "newest":       { "title": "Yangi qo'shilgan", "items": [...] },
  "byCategory": [
    { "category": {...}, "items": [...] }
  ]
}
```

`items` elementi — **`InfluencerCardDto`** (barcha ro'yxatlarda bir xil):
```ts
{
  id, slug, fullName, avatarUrl, isVerified, isFeatured,
  primaryCategory: { id, nameUz, nameRu, icon },
  country: { code, nameUz, nameRu }, city: { nameUz, nameRu },
  tier, totalFollowers, maxEngagementRate, avgViews, growthRate30d,
  platforms: [{ platform, followers }],   // ikona qatorini chizish uchun
  minPrice, isFavorite
}
```

### 3.2 Kategoriyalar
| Metod | Path | Izoh |
|---|---|---|
| GET | `/app/categories` | Daraxt (`?flat=true` bilan tekis ro'yxat) |
| GET | `/app/categories/:slug` | Bitta kategoriya + subkategoriyalar + influencer soni |

### 3.3 Qidiruv va katalog
| Metod | Path | Body | Izoh |
|---|---|---|---|
| POST | `/app/influencers/search` | `InfluencerSearchDto` | Asosiy katalog — aniq tipli DTO (ADR-014, `01-ARCHITECTURE.md` §7.1) |
| POST | `/app/influencers/count` | `InfluencerSearchDto` | Faqat `{totalItems}` — filter varag'i uchun (60 s kesh, kvota sarflamaydi; B2-11) |
| GET | `/app/influencers/filters` | — | Mavjud filter variantlari + min/max qiymatlar |
| GET | `/app/influencers/suggest?q=` | — | Autocomplete (10 ta, 200ms debounce) |

`GET /app/influencers/filters` javobi — frontend filter panelini **dinamik** quradi:
```json
{
  "categories": [...],
  "countries": [...],
  "cities": [...],
  "languages": [...],
  "platforms": ["INSTAGRAM", "TELEGRAM", "YOUTUBE", "TIKTOK"],
  "tiers": ["NANO", "MICRO", "MID", "MACRO", "MEGA"],
  "ranges": {
    "totalFollowers":    { "min": 1200, "max": 4300000 },
    "maxEngagementRate": { "min": 0.4,  "max": 24.8 },
    "avgViews":          { "min": 300,  "max": 1800000 },
    "price":             { "min": 100000, "max": 90000000 }
  }
}
```

### 3.4 Influencer profili
| Metod | Path | Izoh |
|---|---|---|
| GET | `/app/influencers/:slug` | To'liq profil |
| GET | `/app/influencers/:id/accounts/:accountId/growth?period=30d\|90d\|1y` | O'sish grafigi nuqtalari |
| GET | `/app/influencers/:id/accounts/:accountId/posts` | Eng yaxshi postlar |
| POST | `/app/influencers/:id/view` | Ko'rish hisoblagichi (fire-and-forget) |
| POST | `/app/influencers/:id/contact-requests` | `{channel, message?, budget?}` → `ContactRequest` — aloqa so'rovi/lead, auth, 10/min (B2-30) |
| GET/POST | `/app/lists` · GET/PUT/DELETE `/app/lists/:id` · POST `/app/lists/:id/items` · DELETE `/app/lists/:id/items/:influencerId` · GET `/app/lists/:id/export.csv` | Ro'yxatlar (collections, max 20×500); default "Saqlanganlar" = favorites ko'zgusi; CSV (aloqa ustunlari plan bo'yicha) (B2-31) |
| POST/GET | `/app/comparison` · DELETE `/app/comparison/:id` · GET `/public/comparison/:id` | Taqqoslashni saqlash (max 50) → `url` (web `/compare/<id>`), `startapp=cmp_<id>`; public read-only (B2-32) |
| GET/POST | `/app/saved-searches` · PUT/DELETE `/app/saved-searches/:id` · POST `/app/saved-searches/:id/run {page}` | Saqlangan qidiruvlar (max 20; `filters` = InfluencerSearchDto, `notifyNew` → B2-33) (B2-32) |
| GET | `/app/notifications?unread=1` · GET `/app/notifications/unread-count` · POST `/app/notifications/read {ids?}` | Alertlar (B2-33): FOLLOWERS_CHANGE (±`ALERT_FOLLOWERS_PCT` % / 7 kun), VERIFIED, PRICE_NEW (sevimlilar), SAVED_SEARCH_NEW (notifyNew digest); Telegram'ga `allowsWriteToPm && notifyTelegram` bo'lsa. `PUT /auth/me {notifyTelegram, allowsWriteToPm}`; admin `POST /admin/alerts/run` (`ALERT__RUN`) |
| POST | `/app/influencers/:id/claim {message?}` · GET `/app/me/claims` | Creator claim (ADR-016, B2-34): «Bu men» → PENDING; admin `POST /admin/claims/search`, `PUT /admin/claims/:id {status, adminNote}` (CLAIM__VIEW/UPDATE); APPROVED → `Influencer.ownerUserId` |
| GET/PUT | `/app/creator/profile` · PUT `/app/creator/prices` · GET `/app/creator/stats` · GET `/app/creator/oauth/google/start` → `{url}` · GET `/auth/oauth/google/callback` | Creator kabineti: aloqa/bio, narxlar (minPrice qayta hisoblanadi), ko'rishlar/klik/lead statistikasi; YouTube OAuth → `SocialAccount.dataSource=OWNER_API`, `isVerified`, `AudienceDemographics`; `/auth/me` → `creatorOf[]` (B2-34) |
| — | `POST /app/influencers/search {qualityMin}` · sort `qualityScore:desc` · karta/profil `qualityScore` · profil `benchmark` | Auditoriya sifati 0-100 (viewRate 0.4 + ER/kategoriya mediani 0.3 + o'sish anomaliyasi 0.3) va kategoriya x tier median'lari; narx yo'q bo'lsa `benchmark.estimatedPrice` (medianCpm x followers/1000). Admin: `GET /admin/benchmarks`, `POST /admin/benchmarks/recompute`, filter `qualityScore lte 40` (B2-35) |
| GET | `/public/seo/landing?category=&city=&platform=&tier=` · GET `/public/seo/landings` | Programmatik SEO landing'lar (ADR-018, B2-36): kategoriya x shahar (+platforma/tier) — top-12 karta, `totalItems`, o'rtacha ER/obunachi, `priceFrom`, ichki havolalar (boshqa shaharlar/kategoriyalar/platformalar); `landings` — sitemap va `generateStaticParams` uchun (`SEO_LANDING_MIN` dan ko'p profil, `SEO_LANDING_LIMIT` ta). `City.slug` qo'shildi |
| GET | `/app/influencers/:slug/similar` | O'xshash influencerlar — 6 ta (asosiy kategoriya, shahar, tier ±1, popularityScore yaqinligi; 10 daq kesh) (B2-37) |
| — | `POST /app/influencers/search {query}` · `GET /app/influencers/suggest` | Qidiruv sifati (B2-37): `Influencer.searchText` — nom/username va lotin↔kirill variantlari (`Азиз` → `Aziz`), trigram indekslar, relevantlik bo'yicha tartib (similarity/word_similarity), `@username` prefiksi faqat akkaunt nomi bo'yicha. Admin: `GET /admin/search/gaps?days=30` — natijasiz so'rovlar |
| POST | `/app/billing/checkout {planCode, period, provider}` · GET `/app/billing/payments` · GET `/app/billing/subscription` | Obuna sotib olish (B2-40): PAYME/CLICK → `url`, TELEGRAM_STARS → `invoiceLink` (mini app `openInvoice`); to'lov tasdiqlansa obuna uzayadi, kunlik `expire-subscriptions` job muddatini tekshiradi |
| POST | `/public/billing/payme` (JSON-RPC, Basic auth) · `/public/billing/click/prepare` · `/public/billing/click/complete` | Provayder webhook'lari — idempotent (Payme `CreateTransaction/PerformTransaction/CancelTransaction/CheckTransaction/GetStatement`, Click imzo tekshiruvi). Admin: `GET /admin/payments` (`PAYMENT__VIEW`) |
| GET/POST | `/app/org` · PUT `/app/org` · POST `/app/org/members {identifier, role}` · DELETE `/app/org/members/:userId` · POST `/app/org/leave` | Jamoa akkaunti (B2-41): egasi tashkilot yaratadi, a'zolar `Plan.teamMembers` gacha (BUSINESS — 5); a'zo telefon/@username/email bo'yicha qo'shiladi |
| GET | `/app/org/lists` · `/app/org/favorites` · `/app/org/leads` | Jamoaning umumiy ro'yxatlari, sevimlilari va aloqa so'rovlari (a'zolar bo'yicha, kim qo'shgani ko'rinadi) (B2-41) |
| GET | `/public/featured?type=&categoryId=&limit=` | Pullik joylashtirish (B2-42): TOP_SEARCH / CATEGORY_TOP / DASHBOARD_RECOMMENDED kartalari; soatlik job `Influencer.isFeatured` ni faol joylashtirishlar bo'yicha yangilaydi |
| POST | `/app/creator/featured/checkout {type, categoryId?, days, provider}` | Creator o'z profilini joylashtirishni sotib oladi (`FEATURED_PRICE_PER_DAY` × kun) — to'lov tasdiqlansa `FeaturedPlacement` yaratiladi. Admin: `POST /admin/featured/search`, `POST /admin/featured`, `PUT/DELETE /admin/featured/:id` (`FEATURED__VIEW/UPDATE`) |
| GET | `/app/influencers/:slug/media-kit.pdf` · `/app/lists/:id/export.pdf` | Media kit PDF (ko'rsatkichlar, tarmoqlar, narxlar, benchmark; aloqa — `Plan.canSeeContacts`) va ro'yxat PDF (`Plan.canExport`). Kirill uchun `MEDIA_KIT_FONT` (TTF); berilmasa matn lotinga translit qilinadi (B2-43) |
| GET | `/app/me/contact-requests` | So'rovlarim (oxirgi 200) (B2-30) |
| POST | `/admin/leads/search` · GET `/admin/leads/stats` · PUT `/admin/leads/:id` | Admin lead ro'yxati (DSL), statistika, holat (`LEAD__VIEW/UPDATE`) (B2-30) |
| POST | `/app/influencers/:id/contact-click` | `{channel: TELEGRAM\|PHONE\|EMAIL}` → `{counted}` — aloqa tugmasi (lead), 1 soatda 1 marta (W2-04) |

Profil javobi:
```json
{
  "id": "...", "slug": "aziz-food", "fullName": "Aziz Karimov",
  "avatarUrl": "...", "coverUrl": "...", "bioUz": "...", "bioRu": "...",
  "isVerified": true, "gender": "MALE", "birthYear": 1995,
  "country": {...}, "city": {...}, "languages": [...],
  "categories": [{ ...,"isPrimary": true }],
  "contact": { "email": "...", "phone": "...", "telegram": "..." },   // planga bog'liq
  "summary": {
    "totalFollowers": 450000, "maxEngagementRate": 7.8,
    "avgViews": 82000, "growthRate30d": 8.5, "tier": "MACRO"
  },
  "socialAccounts": [
    {
      "id": "...", "platform": "INSTAGRAM", "username": "azizfood",
      "url": "https://instagram.com/azizfood", "isPrimary": true,
      "stats": {
        "followers": 250000, "avgLikes": 15400, "avgComments": 420,
        "avgViews": 80000, "engagementRate": 6.2, "viewRate": 32.0,
        "postFrequency": 0.8, "growth30d": 8.5, "postsCount": 1240
      },
      "lastSyncedAt": "2026-08-28T03:00:00Z", "dataSource": "API"
    }
  ],
  "prices": [{ "platform": "INSTAGRAM", "format": "POST", "price": 3500000, "currency": "UZS" }],
  "isFavorite": false,
  "locked": []
}
```

> **`locked` maydoni.** `FEATURE_GATING_ENABLED=true` bo'lganda yashirilgan maydonlar
> nomlari shu massivda qaytadi (masalan `["contact", "socialAccounts[].stats.growth30d"]`),
> frontend ularning o'rniga "Pro'ga o'ting" blurini ko'rsatadi.
> Hozir bu massiv doim bo'sh (ADR-008).

### 3.5 Favorites
| Metod | Path |
|---|---|
| GET | `/app/favorites` |
| POST | `/app/favorites` `{influencerId, note?}` |
| DELETE | `/app/favorites/:influencerId` |

### 3.6 Taqqoslash
| Metod | Path | Izoh |
|---|---|---|
| POST | `/app/comparison/preview` | `{influencerIds: string[]}` -> saqlamasdan taqqoslash jadvali |
| GET | `/app/comparison` | Saqlangan taqqoslashlar ⏸ MVP-KEYIN (ADR-015) |
| POST | `/app/comparison` | `{name, influencerIds}` |
| DELETE | `/app/comparison/:id` |

`preview` javobi — frontend jadval chizishi uchun tayyor ustunlar:
```json
{
  "influencers": [{ id, fullName, avatarUrl, slug }],
  "rows": [
    { "key": "totalFollowers", "labelUz": "Obunachilar", "labelRu": "Подписчики",
      "format": "number", "values": [250000, 320000], "best": 1 },
    { "key": "maxEngagementRate", "labelUz": "Engagement", "labelRu": "Вовлечённость",
      "format": "percent", "values": [7.2, 4.8], "best": 0 }
  ]
}
```
`best` — eng yaxshi qiymat indeksi (frontend uni yashil qiladi).

### 3.7 Saqlangan qidiruvlar ⏸ MVP-KEYIN (ADR-015)
| Metod | Path |
|---|---|
| GET / POST / DELETE | `/app/saved-searches` |

### 3.8 Mini App'ga xos
| Metod | Path | Izoh |
|---|---|---|
| GET | `/app/share/influencer/:slug` | Telegram'ga ulashish uchun deep link + matn |

```json
{
  "url": "https://t.me/<bot>/app?startapp=inf_aziz-food",
  "shareUrl": "https://t.me/share/url?url=...&text=...",
  "text": "Aziz Karimov — 450K obunachi, 7.8% ER"
}
```

### 3.9 Tariflar
| Metod | Path | Izoh |
|---|---|---|
| GET | `/app/plans` | Tarif ro'yxati va limitlar (pricing sahifasi uchun, public) |

---

## 4. Admin — `/admin/**`

Barcha route: `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` + `@Permissions(...)`.

### 4.1 Standart CRUD shakli (har bir resurs uchun bir xil)
```
POST   /admin/<resource>/search     QueryRequestDto -> PageableResponseDto
GET    /admin/<resource>/:id
POST   /admin/<resource>
PUT    /admin/<resource>/:id
DELETE /admin/<resource>/:id        (soft delete)
POST   /admin/<resource>/:id/restore
```

### 4.2 Resurslar
| Resurs | Permission prefiksi |
|---|---|
| `/admin/users` | `USER__` |
| `/admin/admins` | `ADMIN__` |
| `/admin/roles` | `ROLE__` |
| `/admin/categories` | `CATEGORY__` |
| `/admin/influencers` | `INFLUENCER__` |
| `/admin/social-accounts` | `SOCIAL_ACCOUNT__` |
| `/admin/countries`, `/admin/cities`, `/admin/languages` | `REFERENCE__` |
| `/admin/plans` | `PLAN__` |
| `/admin/banners`, `/admin/pages`, `/admin/settings` | `CONTENT__` |
| `/admin/featured` | `FEATURED__` |

### 4.3 Influencer maxsus amallari
| Metod | Path | Izoh |
|---|---|---|
| POST | `/admin/influencers/:id/publish` | `status: DRAFT -> PUBLISHED` |
| POST | `/admin/influencers/:id/verify` | Tasdiqlangan profil belgisi |
| POST | `/admin/influencers/:id/recalculate` | Aggregatlarni qayta hisoblash |
| GET | `/admin/influencers/:id/analytics` | To'liq analytics + sinxronizatsiya holati |
| POST | `/admin/influencers/:id/categories` | Kategoriyalarni biriktirish |
| POST | `/admin/influencers/:id/prices` | Narxlarni yangilash |

### 4.4 Statistika kiritish (uchala kanal — ADR-005)
| Metod | Path | Izoh |
|---|---|---|
| PUT | `/admin/social-accounts/:id/stats` | **Qo'lda kiritish**. `manualFields` avtomatik to'ldiriladi |
| POST | `/admin/social-accounts/:id/sync` | **Darhol sinxronizatsiya** (navbatga qo'yadi) |
| POST | `/admin/social-accounts/:id/lock` | `{manualLock: bool, fields: string[]}` |
| GET | `/admin/social-accounts/:id/sync-logs` | Sinxronizatsiya tarixi |
| POST | `/admin/social-accounts/:id/snapshots` | Tarixiy nuqtani qo'lda qo'shish |
| GET | `/admin/sync/status` | Umumiy holat: nechta akkaunt SUCCESS/FAILED/NEVER |
| POST | `/admin/sync/run` | Barcha akkauntlarni navbatga qo'yish |

`PUT /admin/social-accounts/:id/stats` body:
```json
{
  "followers": 250000, "avgLikes": 15400, "avgComments": 420, "avgViews": 80000,
  "postsCount": 1240, "measuredAt": "2026-08-28",
  "lockFields": true
}
```
> `engagementRate`, `viewRate`, `growth*` — **backend hisoblaydi**, admin kiritmaydi.
> `measuredAt` o'tmishdagi sana bo'lishi mumkin — bu holda faqat o'sha kunning
> snapshot'i yoziladi (tarixiy backfill), joriy holat va aggregatlar tegilmaydi.

### 4.5 Import (ikki bosqichli)
| Metod | Path | Izoh |
|---|---|---|
| GET | `/admin/imports/template?type=INFLUENCER` | Namuna CSV/XLSX fayl |
| POST | `/admin/imports` | multipart: `file`, `type` -> `{id, status: VALIDATING}` |
| GET | `/admin/imports/:id` | Holat + `preview` + `errors` |
| POST | `/admin/imports/:id/apply` | Tasdiqlash -> yozish boshlanadi |
| DELETE | `/admin/imports/:id` | Bekor qilish |
| GET | `/admin/imports` | Tarix |

### 4.6 Admin dashboard
| Metod | Path |
|---|---|
| GET | `/admin/dashboard` |

```json
{
  "counters": { "influencers": 1240, "published": 980, "draft": 260,
                "users": 3400, "newUsersToday": 42, "categories": 15 },
  "syncHealth": { "success": 820, "failed": 14, "never": 146,
                  "lastRunAt": "2026-08-28T03:00:00Z" },
  "topViewed": [...],
  "recentImports": [...],
  "usersChart": [{ "date": "2026-08-01", "count": 12 }, ...]
}
```

### 4.7 Fayllar
| Metod | Path |
|---|---|
| POST | `/admin/files/upload` (multipart) |
| GET | `/files/:year/:month/:day/:name` (public) |

---

## 5. Permission ro'yxati

```ts
export enum PERMISSIONS {
  USER__VIEW, USER__UPDATE, USER__BLOCK, USER__DELETE,
  ADMIN__CREATE, ADMIN__VIEW, ADMIN__UPDATE, ADMIN__DELETE,
  ROLE__CREATE, ROLE__VIEW, ROLE__UPDATE, ROLE__DELETE, ROLE__PERMISSION__VIEW,
  CATEGORY__CREATE, CATEGORY__VIEW, CATEGORY__UPDATE, CATEGORY__DELETE,
  INFLUENCER__CREATE, INFLUENCER__VIEW, INFLUENCER__UPDATE, INFLUENCER__DELETE,
  INFLUENCER__PUBLISH, INFLUENCER__VERIFY, INFLUENCER__ANALYTICS__VIEW,
  SOCIAL_ACCOUNT__CREATE, SOCIAL_ACCOUNT__VIEW, SOCIAL_ACCOUNT__UPDATE,
  SOCIAL_ACCOUNT__DELETE, SOCIAL_ACCOUNT__STATS__UPDATE, SOCIAL_ACCOUNT__SYNC,
  IMPORT__CREATE, IMPORT__VIEW, IMPORT__APPLY,
  REFERENCE__CREATE, REFERENCE__VIEW, REFERENCE__UPDATE, REFERENCE__DELETE,
  PLAN__VIEW, PLAN__UPDATE,
  FEATURED__CREATE, FEATURED__VIEW, FEATURED__UPDATE, FEATURED__DELETE,
  CONTENT__CREATE, CONTENT__VIEW, CONTENT__UPDATE, CONTENT__DELETE,
  FILE__UPLOAD, FILE__VIEW,
  DASHBOARD__VIEW,
}
```

---

## 6. Sahifalash javobi

```json
{
  "items": [],
  "totalItems": 143,
  "totalPages": 8,
  "currentPage": 1,
  "perPage": 20
}
```

---

## 7. Rate limiting

| Endpoint | Limit |
|---|---|
| `/auth/web/otp/request` ⏸ | 1 / 60s / telefon, 5 / soat / telefon, 20 / soat / IP |
| `/auth/*/login`, `/verify` | 10 / daqiqa / IP |
| `/app/influencers/search` | 60 / daqiqa / user |
| Qolganlar | 120 / daqiqa / IP |

---

## 8. Statistika ko'rsatuvchi maydonlar formati

Backend **raqamni** qaytaradi, frontend formatlaydi:
- `250000` -> `250K` (frontend `Intl.NumberFormat` bilan)
- `engagementRate: 6.2` -> `6.2%`
- Sana: ISO 8601 UTC (`2026-08-28T03:00:00.000Z`)
- Pul: `{ "price": 3500000, "currency": "UZS" }`

---

## 9. Xatolik kodlari

Xato javobi: `{ statusCode, code, message, details?, timestamp, path, requestId }` — `requestId` = `X-Request-Id` sarlavhasi (Sentry/loglar bilan bog'lash, B2-05).

| `code` | HTTP | Ma'nosi |
|---|---|---|
| `VALIDATION_ERROR` | 400 | DTO validatsiyasi |
| `INVALID_FILTER_FIELD` | 400 | Oq ro'yxatda yo'q maydon |
| `INVALID_FILTER_OPERATION` | 400 | Maydon uchun ruxsat etilmagan operatsiya |
| `UNAUTHORIZED` | 401 | Token yo'q yoki muddati o'tgan |
| `INVALID_CREDENTIALS` | 401 | Email/parol xato |
| `INVALID_INIT_DATA` | 401 | Telegram imzosi noto'g'ri |
| `INIT_DATA_EXPIRED` | 401 | `auth_date` 5 daqiqadan eski |
| `INVALID_WIDGET_DATA` | 401 | Login Widget imzosi noto'g'ri (web, ADR-013) |
| `WIDGET_DATA_EXPIRED` | 401 | Widget `auth_date` 5 daqiqadan eski |
| `INVALID_CONTACT_DATA` | 401 | `requestContact` natijasi imzosiz/soxta yoki 5 daqiqadan eski (miniapp, B2-02) |
| `OTP_INVALID` | 401 | Kod noto'g'ri |
| `OTP_EXPIRED` | 401 | Kod muddati tugagan |
| `OTP_TOO_MANY_ATTEMPTS` | 429 | 5 marta xato |
| `OTP_RATE_LIMITED` | 429 | Juda tez-tez so'ralmoqda (`retryAfter` qaytadi) |
| `FORBIDDEN` | 403 | Permission yetishmaydi |
| `PLAN_REQUIRED` | 403 | Yuqoriroq tarif kerak (`requiredPlan` qaytadi) |
| `QUOTA_EXCEEDED` | 429 | Kunlik limit tugagan |
| `NOT_FOUND` | 404 | Resurs topilmadi (Prisma P2025 ham) |
| `CONFLICT` | 409 | Unique/slug band; Prisma P2002 → `details.target` (B2-06) |
| `DUPLICATE_SOCIAL_ACCOUNT` | 409 | Bu influencerda bunday akkaunt bor |
| `MANUAL_LOCK_CONFLICT` | 409 | Qo'lda qulflangan maydonni API yozmoqchi |
| `IMPORT_NOT_VALIDATED` | 409 | Validatsiyadan o'tmagan importni apply qilish |
| `SYNC_PROVIDER_UNAVAILABLE` | 503 | Tashqi provayder javob bermayapti |
