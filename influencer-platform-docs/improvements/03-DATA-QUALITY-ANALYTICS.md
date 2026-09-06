# 03 — Ma'lumot sifati va analytics (P1)

> Platformaning qiymati — **ishonchli raqamlar**. Bu hujjat: (1) aniq buglar, (2) ma'lumot olish strategiyasi,
> (3) analytics'ni chuqurlashtirish. Repo: backend (+ admin UI qismi `05-ADMIN`).

---

## 1. Buglar (P0/P1)

### 1.1 `Category.influencerCount` noto'g'ri

> ✅ Bajarildi (2026-09-06, B2-08): `CategoryCountService.recount(ids?)` — bitta SQL (PUBLISHED + active + deletedAt IS NULL), `categories:tree` kesh tozalanadi; trigger: setCategories, publish, delete, restore, update(active/status), import (batch, bir marta); kunlik `recount-categories` job (tracking navbati, 04:30). `CategoryService.delete` endi BARCHA bindinglarni sanaydi (`details.bindings/published`). Tekshirildi: 41 kategoriya drift=0, DRAFT import sonni o'zgartirmaydi.
- Recount faqat `InfluencerService.setCategories` da. **Import** (`applyRow INFLUENCER` → `influencerCategory.upsert`) recount qilmaydi.
- Hisob **barcha** bindinglarni sanaydi — DRAFT/ARCHIVED/`deletedAt` ham. Public katalog "Food 120" ko'rsatadi, ichida 40 ta nashr qilingan.
- `CategoryService.delete` shu songa tayanadi → "kategoriyaga N ta influencer biriktirilgan" (arxivlanganlar ham).

**Yechim.** `CategoryCountService.recount(categoryIds?)`:
```sql
UPDATE "Category" c SET "influencerCount" = COALESCE(s.c, 0) FROM (
  SELECT ic."categoryId", COUNT(*) c FROM "InfluencerCategory" ic
  JOIN "Influencer" i ON i.id = ic."influencerId"
  WHERE i.status = 'PUBLISHED' AND i.active AND i."deletedAt" IS NULL GROUP BY 1) s ...
```
Trigger: publish/delete/restore/setCategories/import (batch), + kunlik cron (drift himoyasi). `delete` uchun alohida `count` (barcha bindinglar) — "arxivlanganlar ham bor" xabari bilan.

### 1.2 Import: ism bo'yicha slug-merge

> ✅ Bajarildi (2026-09-06, B2-08): INFLUENCER importida ixtiyoriy `slug` ustuni (format tekshiruvi); yangilash FAQAT aniq `slug` bilan, ism mos kelsa ham yangi yozuv (`uniqueSlug` → `-2`); preview'da `NAME_MATCH` ogohlantirishi (admin jadvalida ⚠ ustuni, tooltip). Job darajasidagi `mode` tanlovi qilinmadi — default "yangi yozuv" yetarli.
`applyRow INFLUENCER`: `slugify(fullName)` mavjud bo'lsa **update** — bir xil ismli ikki odam bitta yozuvga birlashadi (ma'lumot yo'qoladi).
**Yechim.** Ustunlar: `slug` (ixtiyoriy, aniq) yoki `externalId`; `slug` yo'q va ism mos kelsa → preview'da `warnings: ['NAME_MATCH — mavjud yozuv yangilanadi']`,
admin `mode: create-new | update-existing` tanlaydi (job darajasida). Default — **yangi yaratish** (`-2` suffiks), yangilash faqat aniq `slug` bilan.

### 1.3 Snapshot bo'lmasa growth 0

> ✅ Bajarildi (2026-09-06, B2-18): `growth7d/30d/90d` va `Influencer.growthRate30d` nullable (migratsiya: <2 snapshot → NULL); `growthSince` → null; `computeAggregates` faqat ma'lumoti bor akkauntlar bo'yicha (hech biri bo'lmasa null); `popularityScore` null'ni neytral (0) oladi; search sort va dashboard "Eng tez o'sayotgan" — `nulls: 'last'`, ma'lumotsizlar blokda chiqmaydi; DTO'lar nullable, 3 frontend `—`/yashirin ko'rsatadi (schema'lar qayta generatsiya).
`growthSince` 30 kunlik snapshot topmasa `0` → yangi influencerlarda `growthRate30d = 0` → "Eng tez o'sayotgan" blokida yolg'on 0. UI'da `null` ("ma'lumot yetarli emas") va `growth30d` faqat ≥ 2 nuqta bo'lganda.
Schema: `SocialAccountStats.growth30d Decimal?` (nullable) yoki `growthAvailable Boolean`.

### 1.4 Popularity og'irliklari o'zgarganda recalculateAll chaqirilmaydi

> ✅ Bajarildi (2026-09-06, B2-18): `ContentService.setSetting('popularity.weights')` → tracking navbatiga `recalculate-all` (`recalculateAll` batch), javobda `recalculating: true`; admin sozlamalar sahifasi "Qayta hisoblanmoqda" toast ko'rsatadi. +2 unit test.
`ContentService.setSetting('popularity.weights')` → kesh tozalanadi, lekin `Influencer.popularityScore` eski. Yechim: setting saqlanganda `recalculate-all` job (navbat) + admin'da "qayta hisoblanmoqda" holati.

### 1.5 Mayda
- `InfluencerService.update`: `countryId` o'zgarib `cityId` qolsa mos kelmasligi tekshirilmaydi (validatePlace faqat ikkalasi berilganda).
- `parse-social-url`: Instagram URL `instagram.com/p/...` RESERVED'da bor, lekin `explore`, `accounts` yo'q; YouTube `@handle` bilan `?si=` query — regex `[A-Za-z0-9_.-]` to'xtaydi, OK.
- `SocialAccountStats.avgViews` YouTube uchun `avgViews` oxirgi 10 video (OK), Telegram `avg_post_reach` — bir xil maydonga, lekin semantika farq qiladi; `measurementNote` yoki `metricDefinition` metadata.

---

## 2. Ma'lumot olish strategiyasi (P1 — mahsulot xavfi)

Hozir: YouTube (rasmiy, bepul kvota), TGStat (pulli, token yo'q), Instagram/TikTok RapidAPI (kalit yo'q, noaniq ToS/barqarorlik), mock. Real ma'lumot manbai — **admin qo'lda + import**. Bu masshtablanmaydi.

| Kanal | Qonuniylik | Nima beradi | Xarajat | Tavsiya |
|---|---|---|---|---|
| **Creator claim + OAuth connect** (YouTube Data API OAuth, Instagram Graph API via Facebook Login "instagram_basic, instagram_manage_insights", TikTok Login Kit) | Rasmiy, ToS mos | Followers, reach, **auditoriya demografiyasi**, post metrikalari — eng boy ma'lumot | Bepul (kvota), integratsiya ishi | **Asosiy yo'l** (`09-FEATURE-IDEAS` §1) |
| Telegram MTProto (`channels.getFullChannel` — `participants_count`) o'z user akkaunti orqali | Rasmiy client API, ToS: avtomatlashtirilgan "user bot" cheklovlari — ehtiyot (rate limit, faqat public kanallar) | Obunachilar soni, post views (`messages.getHistory` views) | Bepul | TGStat o'rniga/yoniga; `TelegramMtprotoProvider` (gramjs) — alohida worker, sekin tempda (1 kanal / 3 s) |
| TGStat API | Pulli, rasmiy | ER, reach, o'sish | $$ | Byudjet bo'lsa; provider tayyor |
| RapidAPI (Instagram/TikTok) | Kulrang zona (aksariyati scraping) | Followers, oxirgi postlar | $ | Faqat adapter/stub (bor); qaror ADR-005 ruhida — asosiy manba qilmaslik |
| Foydalanuvchi hisobotlari / influencer o'zi yuboradi (skrinshot + admin tasdiqlaydi) | OK | Reach/impressions (story) | Odam vaqti | "Stats so'rovi" oqimi — creator claim'ning bir qismi |

**Qaror taklifi (ADR-016):** MVP+1 da **creator self-service** — influencer Telegram orqali kiradi, profilini claim qiladi (admin tasdiqlaydi),
YouTube/Instagram'ni OAuth bilan ulaydi → `SocialAccount.dataSource = 'OWNER_API'`, `AudienceDemographics` to'ladi, `isVerified` avtomatik.
Bu ADR-005 (uch kanal) ga 4-kanal qo'shadi: `OWNER_API` (`DATA_SOURCE` enum'ga).

---

## 3. Analytics'ni chuqurlashtirish (P2)

### 3.1 Auditoriya sifati (fake follower signali)

> ✅ Bajarildi (2026-09-06, B2-35): backend `Influencer.qualityScore` (viewRate 0.4 + ER/kategoriya mediani 0.3 + o'sish anomaliyasi 0.3; 7 kunda +50 % → 0 ball) va `CategoryBenchmark` (kategoriya × tier: medianEr, p25/p75, medianViewRate, medianCpm, medianQuality, sampleSize ≥ 3) — kunlik `compute-benchmarks` job (04:40); qidiruvda `qualityMin` filtri va `qualityScore:desc` sort, kartada/profilda ko'rsatkich, profilda `benchmark.erRatio` va narx yo'q bo'lsa `estimatedPrice`; admin `GET /admin/benchmarks`, `POST /admin/benchmarks/recompute`, filter `qualityScore lte 40` (shubhalilar); e2e 4 + unit 4 test; web/miniapp: sifat belgisi, «Auditoriya sifati (min)» filtri, profilda benchmark qatori.
Formulalar bor (`viewRate`), lekin flag yo'q. `audienceQuality` (0–100): `viewRate` (og'irlik 0.4), ER kategoriya medianiga nisbati (0.3), o'sish anomaliyasi (7 kunda +50 % followers, ER tushgan — 0.3). Natija: `Influencer.qualityScore Decimal`, karta/profilda "Auditoriya sifati: yaxshi/shubhali", filter `qualityMin`. Admin: "shubhali" ro'yxati (tekshirish uchun).

### 3.2 Kategoriya benchmark'lari

> ✅ Bajarildi (2026-09-06, B2-35): §3.1 izohiga qarang — `CategoryBenchmark` kunlik hisoblanadi, profilda «ER kategoriya medianidan 1.8×» va narxsizlar uchun taxminiy narx (medianCpm × followers/1000).
Kunlik job: har kategoriya × tier bo'yicha median `engagementRate`, `viewRate`, `avgViews/followers`, `price per 1k followers` (narx bo'lsa).
`CategoryBenchmark { categoryId, tier, medianEr, p25, p75, medianCpm, sampleSize, computedAt }`. Profilda "ER kategoriya o'rtachasidan 1.8× yuqori"; taqqoslashda "benchmark" ustuni; narx yo'q bo'lsa **taxminiy narx** (medianCpm × followers/1000).

### 3.3 O'sish grafigi kengaytmasi
- `1y` oylik — bor. Qo'shish: `all`, ER va avgViews chizig'i (points'da bor, UI toggle bor), snapshot manbai belgisi (MANUAL/API) — chiziqda nuqta shakli.
- Backfill CSV shabloni (`STATS` import `measuredAt` bilan) — bor; admin UI'da "tarixni yuklash" alohida tugma (`05-ADMIN`).

### 3.4 Trending sifat

> ✅ Bajarildi (2026-09-06, B2-18): `trendingScore(current, prev, minViews)` = log(1+current)·current/max(prev,1), chegara `TRENDING_MIN_VIEWS` (default 20); chegaradan past → trending'ga kirmaydi (dashboard fastestGrowing'ga tushadi).
`views(7d)/views(prev 7d)` — kam ko'rilgan profillar (1→5 ko'rish = 5×) yuqoriga chiqadi. Minimal chegara (`current >= 20`) + Wilson/log damping: `score = log(1+current) * ratio`.

### 3.5 Qidiruv sifati (pg_trgm bor, ishlatilmaydi)
`influencer_fullname_trgm` indeks bor, lekin `contains` (ILIKE `%q%`) — indeks GIN trigram bilan ishlaydi (OK), ammo **ranking** yo'q: `similarity(fullName, q)` bo'yicha sort (`$queryRaw`), `suggest` da `word_similarity`; `@username` prefiksi → faqat username'da. Sinonim/lotin-kirill: `Aziz`↔`Азиз` — `unaccent` + translit jadvali (uz lotin/kirill) kiritish.

---

## 4. Admin tomonidagi ma'lumot sifati paneli (`05-ADMIN` §3 bilan)

Backend endpoint `GET /admin/data-quality`: `NEVER` sinxron akkauntlar, `statsUpdatedAt` > 30 kun, avatar yo'q, narx yo'q, bio yo'q, kategoriya yo'q, `viewRate < 10 %`, dublikat username (turli influencerlarda bir xil `platform+username`), `FAILED` sync (sabab bo'yicha guruh). Har ro'yxat → jadvalga havola (DSL filter bilan).

---

## Qarorlar (taklif)

- ADR-016: `OWNER_API` kanal, creator claim/connect. (`09-FEATURE-IDEAS` §1)
- `growth30d` nullable — "ma'lumot yetarli emas". (frontend'lar `null` ni ko'rsatadi)
