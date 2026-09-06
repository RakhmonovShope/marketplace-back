# 02 — Backend: performance va masshtab (P1)

> Repo: `influencer-backend`. Tartib — foyda/xarajat bo'yicha. Har band: **Hozir → Yechim → O'lchash**.

---

## 1. Har himoyalangan so'rovda `user + role` DB'dan

> ✅ Bajarildi (2026-09-06, B2-10): `AuthUserCacheService` (`auth:user:<id>`, TTL 60 s, +4 unit test) → `JwtStrategy.validate` DB'siz; invalidatsiya: `UserService.block/unblock`, `AdminService.update/delete/restore`, `RoleService.update` (`invalidateRole` — shu roldagi userlar). Smoke: kalit TTL 60, block → kalit o'chadi → keyingi so'rov darhol 403, unblock → 201.

**Hozir.** `JwtStrategy.validate` → `prisma.user.findUnique({ include: { role } })`; `PermissionsGuard` shu natijaga tayanadi.
Admin panel sahifasi 5 so'rov = 5 query; public `OptionalAuthGuard` route'larida ham.

**Yechim.** Redis kesh `auth:user:<id>` (TTL 60 s) → `{ id, type, roleId, roleCode, permissions, active, blockedAt }`.
Invalidatsiya: `UserService.block/unblock`, `RoleService.update` (o'sha rol foydalanuvchilari — `delByPattern` emas, `role:<id>:users` to'plami),
`AdminService.update`. Kesh miss → DB. **O'lchash:** pino `db.queries` / so'rov (Prisma `$on('query')` counter) — admin'da 1 → 0.

---

## 2. Qidiruv: `count + findMany` har safar, keshsiz

> ✅ Bajarildi (2026-09-06, B2-11): `SearchService`: count keshi `search:count:<sha1(where)>` 60 s, anonim natija `search:res:<sha1(dto)>` 30 s (isFavorite keyin qo'yiladi), kategoriya bolalari `categories:tree` keshidan (DB query yo'q); `POST /app/influencers/count` → `{totalItems}` (kvota sarflamaydi); miniapp `useInfluencerCount` → `/count` + 400 ms debounce. +3 unit test. Smoke: 2-anonim so'rov DB'siz (log "search kesh hit"), Redis'da res/count kalitlari, count = search.totalItems.

**Hozir.** `SearchService.search`: kategoriya bolalari query + `$transaction([count, findMany+include])`. Miniapp filter varag'i
har o'zgarishda **ikkinchi** `search` (perPage=1) faqat `totalItems` uchun (`useInfluencerCount`). Anonim trafik (SEO, Telegram
preview botlari) bir xil so'rovlarni takrorlaydi.

**Yechim.**
1. `count` keshi: `search:count:<sha1(where)>` TTL 60 s (natija ro'yxati keshlanmaydi — ADR-010 saqlanadi, lekin count arzon va keshlansa bo'ladi).
2. Anonim (userId yo'q) so'rovlar uchun `search:res:<sha1(dto)>` TTL 30 s — bot/crawler to'lqinlaridan himoya; personalizatsiya (`isFavorite`) baribir keyin qo'yiladi.
3. Kategoriya bolalari — `categories:tree` keshidan (alohida query o'rniga).
4. Miniapp: `useInfluencerCount` 400 ms debounce + `keepPreviousData` (allaqachon bor) — yoki `POST /app/influencers/count` yengil endpoint (faqat count, kesh bilan).
5. `@Throttle({ default: { limit: 60, ttl: 60_000 } })` search'ga (kontrakt §7 aytgan, kodda yo'q).

---

## 3. `recountViews`: soatiga N ta `UPDATE`

> ✅ Bajarildi (2026-09-06, B2-12): `recountViews` — bitta `UPDATE … FROM (GROUP BY)` (faqat `viewCount < count` bo'lsa ko'taradi); `viewCount` endi `trackView`'da `increment` (umrbod hisoblagich, retention'dan keyin ham saqlanadi); kunlik `cleanup-tracking` job (04:20): ProfileView `PROFILE_VIEW_RETENTION_DAYS` (90), SearchLog `SEARCH_LOG_RETENTION_DAYS` (180). +4 unit test. Smoke: view → viewCount +1; SQL dev DB'da 41 ms (O(1) so'rov, N ta UPDATE emas).

**Hozir.** `profileView.groupBy` → har influencer uchun `influencer.update` (10k influencer = 10k query har soat).
**Yechim.** Bitta SQL:
```sql
UPDATE "Influencer" i SET "viewCount" = v.c
FROM (SELECT "influencerId", COUNT(*) c FROM "ProfileView" GROUP BY 1) v WHERE v."influencerId" = i.id AND i."viewCount" <> v.c;
```
(`$executeRaw`). `computeTrending` — OK. Retention: `ProfileView` > 90 kun → o'chirish (kunlik job), `viewCount` saqlanib qoladi (yoki `ProfileViewDaily` agregat jadvali).

---

## 4. Aggregate invalidatsiyasi: har chaqiruvda 2× Redis `SCAN`

> ✅ Bajarildi (2026-09-06, B2-13): `CACHE_KEYS` (aniq kalitlar), `recalculateMany(ids)` — 50 talik chunk, 1 findMany + 1 groupBy, update'lar bitta tranzaksiyada, `del(influencer:<id>:profile)`; `recalculate(id)`/`recalculateAll`/import shu orqali; `InfluencerService.invalidate`, banner'lar ham aniq kalit. Dashboard: `dashboard:dirty` bayroq + stale-while-revalidate (`setNx` qulf bilan fon yangilanish, §10). +3 unit test. Redis MONITOR: SCAN 0, UNLINK profile 1, dirty set/del ko'rindi. Qolgan `delByPattern`: faqat `plan:*` (subscription, kam chaqiriladi).

**Hozir.** `InfluencerAggregateService.recalculate` → `delByPattern('influencer:<id>:*')` + `delByPattern('dashboard:*')` (SCAN butun keyspace).
Import 1 000 satr = 2 000 SCAN; `recalculateAll` (10k) = 20k SCAN + ketma-ket.

**Yechim.**
- Aniq kalitlar: `del('influencer:<id>:profile')` (boshqa `influencer:<id>:*` kaliti yo'q); dashboard — `del('dashboard:main')`.
- `recalculate(ids[])` batch varianti: bitta `socialAccount.findMany({ where: { influencerId: { in } } })`, `Promise.all` chunk'lar (50), dashboard keshini oxirida bir marta.
- Import/sync: `touchedInfluencers` uchun batch (`import.service.ts` allaqachon to'playdi).

---

## 5. Import: satr-satr N+1

> ✅ Bajarildi (2026-09-06, B2-14): `preloadRefs(type, rows)` — influencer slug'lari, kategoriya, davlat, shahar, akkauntlar BIR MARTA `findMany({ in })` (1000 talik chunk) → Map; `validateRefs`/`detectAction` sinxron, `applyRow` Map'dan (yangi yozuvlar Map'ga qo'shiladi, isPrimary hisobi ham). +2 unit test. O'lchov: 5 000 satr STATS validate — 37 ms (dev DB, 3 ta query), 100 xato satr to'g'ri topildi. Apply bosqichi satr-satr yozadi (inherent), lekin lookup'lar Map'dan. `MAX_IMPORT_ROWS` — B2-07.

**Hozir.** `runValidate`: har satr uchun `validateRefs` (1–2 query) + `detectAction` (1 query) → 5k satr ≈ 15k query.
`runApply`: har satr `applyStats` (≈8 query + recalculate).

**Yechim.** Validatsiyadan oldin referenslarni **bir marta** yuklash: barcha `influencerSlug`/`categorySlug`/`countryCode` to'plami →
`findMany({ where: { slug: { in } } })` → Map. `applyRow` uchun ham (influencer/account lookup Map'dan). Progress `processedRows` har 100 (bor).
Katta fayl (10k+) → `IMPORT_MAX_ROWS` chegarasi + xabar.

---

## 6. Sync: retry va provayder kvotasi

**Hozir.** `syncAccount` xato → `throw` → BullMQ 3× exponential retry — provayder "kanal topilmadi" (doimiy xato) uchun ham; har urinish yangi `SyncLog`.
`enqueueAll` 03:00 da hamma akkauntni bir vaqtda, `concurrency: 3`, provayder bo'yicha limit yo'q (YouTube kvotasi 10k unit/kun ≈ 2 500 kanal).

**Yechim.**
- Doimiy xatolar (`404`, `handle topilmadi`) → `throw new UnrecoverableError(msg)` (bullmq) — retry yo'q; `SocialAccount.syncError` + `syncStatus FAILED`.
- Provayder bo'yicha rate limit: `SyncProcessor` ichida per-provider token bucket (Redis) yoki alohida navbatlar `sync:youtube`, `sync:tgstat` (`limiter: { max, duration }`).
- Ustuvorlik: `popularityScore` yuqori / `lastSyncedAt` eski akkauntlar avval; kunlik byudjet `SYNC_DAILY_LIMIT_<PROVIDER>`.
- `SyncLog.rawPayload` 30 kun tozalanadi (bor); `SyncLog` yozuvlari 180 kun.

---

## 7. Statik fayllar: cache header'siz, Nest orqali

**Hozir.** `ServeStaticModule` (`/files`) default `maxAge: 0` → `<img>` har safar qayta so'raydi (web `next/image` o'zi keshlaydi, miniapp/admin — yo'q).
**Yechim.** `serveStaticOptions: { maxAge: '365d', immutable: true, etag: true, setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }`
(fayl nomlari UUID — o'zgarmas). Prod'da nginx `location /files/ { alias /srv/uploads/files/; expires 1y; }` (volume ulanadi) — Nest qatnashmaydi.
`File.url` da `PUBLIC_URL` "muzlatilgan" → domen o'zgarsa DB migratsiya; `File.path` (nisbiy) saqlab, URL o'qishda qurish (`07-DEVOPS` §8 CDN uchun ham).

---

## 8. Throttler storage in-memory

2+ instans bo'lganda limitlar instans-lokal. `@nest-lab/throttler-storage-redis` (mavjud `REDIS_CLIENT`). S1 (`trust proxy`) bilan birga.

---

## 9. Worker ajratish (bayroqlar)

**Hozir.** `WORKER_MODE=true` alohida jarayon, lekin API jarayonida ham **barcha processor'lar** ro'yxatdan o'tadi (sync/import/image/tracking) →
2 API replica + 1 worker = 3 ta worker; `sharp` va import CPU'ni API'da yeydi.
**Yechim.** `QUEUE_WORKERS_ENABLED` (API'da `false`): processor providerlarini shartli ro'yxatdan o'tkazish
(`...(workersEnabled ? [SyncProcessor, ...] : [])`) — `Queue` (enqueue) hamma joyda, `Processor` faqat worker'da. Bot ham faqat worker'da (`BOT_ENABLED`).
Repeatable job'lar (`onApplicationBootstrap`) — `jobId` bilan idempotent (bor), lekin faqat worker qo'shsin.

---

## 10. Dashboard va profil keshi — kichik yaxshilashlar

> ✅ Qisman (2026-09-06, B2-13): `dashboard:main` invalidatsiya o'rniga `dashboard:dirty` + o'qishda fon yangilanish (`setNx` qulf). Qolganlari (`search:filters` invalidatsiyasi, `registrations` raw SQL) — keyingi qadamlarda.

- `dashboard:main` (10 min) invalidatsiyasi har `recalculate` da → yuqori yozish oqimida deyarli doim miss. `stale-while-revalidate`: TTL 10 min, invalidatsiya o'rniga `dashboard:dirty` bayrog'i + cron 1 daqiqada qayta hisoblash.
- `search:filters` (1 soat) kategoriya/ma'lumotnoma o'zgarganda invalidatsiya qilinmaydi → `CategoryService.invalidate`/`ReferenceService` ga `del('search:filters')`.
- `AdminDashboardService.registrations` 30 kunlik userlarni xotiraga yuklaydi → `groupBy` `date_trunc` raw SQL.
- Profil keshida `viewCount/favoriteCount` 5 daqiqa eskiradi — maqbul; yoki ularni keshdan tashqarida (alohida `select`) qo'shish.

---

## 11. Prisma/DB

- `Influencer.minPrice` bo'yicha filter/sort indekssiz → `@@index([status, active, minPrice])`; `avgViews` sort ham (`@@index([status, active, avgViews(sort: Desc)])`).
- `Category.slug @unique` + `@@index([slug])`, `Influencer.slug` — dublikat indeks (unique yetarli) → olib tashlash.
- `DATABASE_URL?connection_limit=10&pool_timeout=10`; sekin so'rov logi (`$on('query')` > 200 ms → warn).
- `SearchLog @@index([query])` free-text uchun foydasiz → `@@index([createdAt])` yetarli; "mashhur so'rovlar" uchun kunlik agregat.

---

## 12. O'lchash (avval/keyin)

| Metrika | Maqsad |
|---|---|
| `POST /app/influencers/search` p95 (10k influencer, filter) | < 150 ms |
| Himoyalangan so'rovda DB query soni | admin ≤ 2, public ≤ 1 |
| Import 5 000 satr (STATS) | < 3 daqiqa |
| `recountViews` (10k) | < 2 s |
| Kesh hit (`dashboard`, `profile`, `filters`) | > 90 % |
