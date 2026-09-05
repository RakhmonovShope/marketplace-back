# 06 — Performance va caching (P2, ba'zilari P1)

> Tartib — foyda/xarajat nisbati bo'yicha. Har band: **Hozir → Muammo → Yechim → O'lchash**.

---

## 1. Har so'rovda 2 ta DB query (JwtStrategy) — P1

**Hozir.** `JwtStrategy.validate` har himoyalangan so'rovda `refreshToken.findUnique(sid)` + `user.findFirst(id)`,
keyin `PermissionsGuard` (Redis, cache miss'da yana DB). Admin panel sahifasi 5 so'rov = 10 query.

**Yechim.** Sessiya holatini Redis'da saqlash:
```ts
// key: session:<sid> → { userId, roleId, active } ; TTL = access token TTL (15 min)
// issueTokens → SET ; logout/logoutAll/resetPassword/revoke → DEL (yoki DEL session:* by userId set)
// validate: Redis GET → yo'q bo'lsa DB (fallback) va qayta SET
```
Foydalanuvchi o'chirilsa/`active=false` bo'lsa — `user.changed` event → `DEL`. Redis tushsa — DB fallback (hozirgi mantiq).
**O'lchash:** `pino` request log'da `db.queries` soni (Prisma `$on('query')` counter) — 2 → 0.

---

## 2. Statik fayllar Nest orqali, cache header'siz — P1

**Hozir.** `GET /files/:y/:m/:d/:name`: DB lookup (`File.findUnique`) + `existsSync` + `createReadStream`, `Cache-Control` yo'q.
Har `<img>` — Postgres so'rovi.

**Yechim (bosqichma-bosqich).**
1. Header'lar: `Cache-Control: public, max-age=31536000, immutable` (nom UUID — o'zgarmaydi), `ETag`, `Last-Modified`, `Accept-Ranges`.
2. DB lookup'ni olib tashlash: fayl nomi UUID + kengaytma, path traversal allaqachon tekshiriladi — `File` jadvali faqat
   `/info` uchun. Yoki `File.url → name` ni Redis'da 1 soat.
3. Nginx: `location /files/ { alias /srv/uploads/files/; expires 1y; }` — Nest umuman qatnashmaydi (`10-DEVOPS` §7).
4. S3/MinIO + CDN — `07-FILES-MEDIA.md`.

---

## 3. Public katalog cache (cache-aside) — P1 (katalog paydo bo'lganda)

`src/common/cache/cache.service.ts`:
```ts
async remember<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T>
async invalidateByTag(tag: string) // SET tag:<name> → kalitlar ro'yxati; SCAN emas
```
Kalit sxemasi: `app:cat:tree:uz`, `app:product:<slug>:uz`, `app:search:<sha1(dto)>:uz`. Teglar: `product`, `category:<id>`, `store:<id>`.
Invalidatsiya — `EventEmitter` (`product.changed` → `invalidateByTag('product')`, `invalidateByTag('category:'+id)`).
Stampede himoyasi: `remember` ichida `SET NX lock:<key> 5s`, kutish → qayta o'qish.
HTTP tomonda: `ETag` + `If-None-Match` → 304 (`@nestjs/common` `CacheInterceptor` o'rniga qo'lda, chunki `lang` va auth bor).

---

## 4. Throttler storage in-memory — P1 (2+ instans bo'lganda)

`@nest-lab/throttler-storage-redis` — limitlar instanslar orasida umumiy. `02-BUGS` B2 bilan birga.

---

## 5. Soft delete — qo'lda `deletedAt: null` — P2

Har `findMany/findFirst/count/update` da `deletedAt: null` unutilsa — o'chirilgan yozuv chiqadi (hozir `banner/badge/page` da umuman yo'q).
**Prisma client extension**:
```ts
export const softDeleteExtension = Prisma.defineExtension({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      // findFirst, count, aggregate, update(Many) — xuddi shu; delete → update({deletedAt})
    },
  },
});
```
`prisma.$extends(softDeleteExtension)`; admin "o'chirilganlar" ro'yxati uchun `withDeleted: true` flag (`args.where.deletedAt = undefined`).

---

## 6. Pagination: `count(*)` har sahifada — P2

10k+ qatorda `count` sekin. Variantlar: `?withTotal=false`; `pg_class.reltuples` taxminiy son (filtersiz ro'yxat);
cursor pagination (`createdAt,id` bo'yicha, `after=<base64>`), public katalogda "yana yuklash" uchun.
`page * perPage > 10_000` → 400 (deep offset himoyasi).

---

## 7. Prisma ulanish va sekin so'rovlar — P2

- `DATABASE_URL=...?connection_limit=10&pool_timeout=10` (instans soni × limit < Postgres `max_connections`).
- `$on('query')` → `duration > 200ms` bo'lsa `warn` log (`log: [{emit:'event', level:'query'}]`).
- `relationJoins` preview (5.x) / GA (6.x) — nested `include` bitta SQL bo'ladi.
- PgBouncer (transaction mode) — 3+ instans bo'lganda; `?pgbouncer=true`.
- Indekslar — `03-DATA-MODEL` (har `where`/`orderBy` maydoni uchun); `EXPLAIN (ANALYZE, BUFFERS)` bilan tekshirish.

---

## 8. Worker'ni API'dan ajratish — P2

`sharp` CPU'ni yeydi; hozir bir jarayonda. `src/worker.ts`:
```ts
const app = await NestFactory.createApplicationContext(WorkerModule); // FileModule(processor), AuthModule(email processor), ScheduleModule
```
API `pnpm start:prod`, worker `node dist/worker` (`ROLE=worker`). Processor'lar `ROLE` bo'yicha ro'yxatdan o'tadi
(`BullModule.registerQueue` API'da faqat `Queue`, worker'da `Processor`). Cron ham faqat worker'da (2 instans bo'lsa 2 marta ishlamaydi;
alternativa — `@nestjs/schedule` + Redis lock).

---

## 9. WebSocket ko'p instans — P2

`@socket.io/redis-adapter` (`IoAdapter` extend, `main.ts` da `app.useWebSocketAdapter`). Xonalar `user:<id>` instanslar bo'ylab.

---

## 10. HTTP darajasi — P2

- `compression()` middleware (JSON ro'yxatlar 5–10× kichik). Nginx bo'lsa u yerda (`gzip on`), Nest'da emas.
- Keep-alive default; `app.listen` oldidan `server.keepAliveTimeout = 65_000` (ALB/nginx 60s dan katta).
- Body limit: `express.json({ limit: '1mb' })` — default 100kb `bulk` uchun kam bo'lishi mumkin.

---

## 11. bcrypt event loop'ni bloklaydi — P3

`bcrypt.hash` (rounds 12 ≈ 250ms CPU) libuv thread pool'da — `UV_THREADPOOL_SIZE` allaqachon oshirilgan (`main.ts`). Login yuki
> 50 rps bo'lsa — `argon2` (ham thread pool) yoki auth'ni alohida instansga. Hozircha yetarli.

---

## 12. O'lchash (ishdan oldin va keyin)

| Metrika | Qanday | Maqsad |
|---|---|---|
| p95 latency `/v1/admin/*/pageable` | `k6` (`10-DEVOPS` §9) yoki Prometheus histogram | < 150 ms |
| DB query / request | Prisma query counter → pino | admin ≤ 3, public ≤ 1 (cache hit) |
| Cache hit rate | Redis `INFO stats` yoki counter | public katalog > 90% |
| Image job vaqti | BullMQ `processedOn - timestamp` | < 2 s (1600px) |

---

## Qarorlar

- Sessiya cache TTL = access TTL (15 min). Revoke — darhol `DEL`.
