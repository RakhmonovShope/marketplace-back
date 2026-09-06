# 08 — Kuzatuv (observability) va ekspluatatsiya (P1)

> Maqsad: production'da "nima bo'lyapti?" savoliga 1 daqiqada javob topish.
> Hozir: matnli `Logger`, request id yo'q, xatolar faqat konsolda, metrika yo'q, health faqat DB.

---

## 1. Strukturali log + request id

> ✅ Bajarildi (2026-09-06, STEP-13): `nestjs-pino` 4 + `pino-http` 10 (`LoggerModule.forRootAsync`): JSON loglar (prod) / pino-pretty (dev, `LOG_PRETTY`), `LOG_LEVEL`, `genReqId` → `X-Request-Id` javob sarlavhasi (mijoz bergani saqlanadi), `userId` customProps, authorization/cookie redact, `/health`, `/files`, `/api`, `/metrics` auto-log'dan tashqarida; `LoggingInterceptor` o'chirildi; xato javobida `requestId`. §2: `@sentry/nestjs` — `src/instrument.ts` (main.ts'da birinchi import, `SENTRY_DSN` bo'lsa init), `SentryModule.forRoot()`, filter 5xx'da `captureException` (requestId bilan).

`nestjs-pino` + `pino-http`:
```ts
LoggerModule.forRoot({
  pinoHttp: {
    level: isProd ? 'info' : 'debug',
    transport: isProd ? undefined : { target: 'pino-pretty' },
    genReqId: (req) => req.headers['x-request-id'] ?? randomUUID(),
    customProps: (req) => ({ userId: req.user?.id, lang: req.lang }),
    redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.refreshToken'],
    autoLogging: { ignore: (req) => req.url === '/health' || req.url.startsWith('/files/') },
  },
}),
```
- `main.ts`: `app.useLogger(app.get(Logger))` — barcha `new Logger('X')` chaqiruvlari pino orqali chiqadi (kod o'zgarmaydi).
- Javob header'ida `X-Request-Id`; `AllExceptionsFilter` body'siga `requestId`.
- `LoggingInterceptor` — o'chiriladi (pino-http buni qiladi, xatolarda ham).
- BullMQ job loglarida `jobId`, `imageUploadId` — `logger.child({ jobId })`.
- Loglar stdout → Docker → Loki/ELK (`10-DEVOPS`). Faylga yozish shart emas.

---

## 2. Xatolarni kuzatish — Sentry

`@sentry/nestjs` (`Sentry.init` `main.ts` ning eng boshida, `SENTRY_DSN` bo'lsa), `SentryGlobalFilter` yoki mavjud
`AllExceptionsFilter` ichida `statusCode >= 500` bo'lsa `Sentry.captureException(exception, { extra: { requestId } })`.
4xx — yuborilmaydi (shovqin). BullMQ `failed` eventlarida ham `captureException`. Release: `git sha` (`SENTRY_RELEASE`).

---

## 3. Metrikalar — Prometheus

`@willsoto/nestjs-prometheus` (`prom-client`), `GET /metrics` (`VERSION_NEUTRAL`, ichki tarmoqdan yoki basic auth):

| Metrika | Tur | Label |
|---|---|---|
| `http_request_duration_seconds` | histogram | `method`, `route` (`req.route.path`, param'siz), `status` |
| `http_requests_in_flight` | gauge | — |
| `db_query_duration_seconds` | histogram | `model`, `action` (Prisma `$on('query')` yoki extension) |
| `bullmq_jobs_total` | counter | `queue`, `status` |
| `bullmq_queue_waiting` | gauge | `queue` (har 15 s `getJobCounts`) |
| `cache_requests_total` | counter | `result=hit|miss` |
| `auth_login_total` | counter | `result=ok|invalid|locked` |
| Node default (`collectDefaultMetrics`) | — | heap, event loop lag, GC |

Grafana dashboard: p50/p95/p99, RPS, 5xx rate, navbat uzunligi, event loop lag. Alert: 5xx > 1% (5 min), p95 > 500 ms, navbat > 100, event loop lag > 200 ms.

---

## 4. Health: liveness vs readiness

Hozir `GET /health` faqat Prisma. Kengaytma (`@nestjs/terminus` bor):
```ts
@Get('live')  live()  { return this.health.check([]); }                       // jarayon tirik
@Get('ready') ready() { return this.health.check([
  () => this.prismaHealth.isHealthy('database'),
  () => this.redisHealth.isHealthy('redis'),           // ioredis ping, 1s timeout
  () => this.disk.checkStorage('uploads', { path: uploadsDir, thresholdPercent: 0.9 }),
  () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
  () => this.queueHealth.isHealthy('image', { maxWaiting: 500 }),
]); }
```
`/health` — `ready` alias (mavjud monitoring buzilmasin). Docker `HEALTHCHECK` va k8s probe'lar `/health/ready`.
Redis tushsa — `ready` false (PermissionsGuard DB fallback qiladi, lekin sessiya cache/throttler ishlamaydi — trafikni olmaslik to'g'ri).

---

## 5. Graceful shutdown

- `PrismaService.onModuleDestroy → $disconnect()`; `RedisModule.onApplicationShutdown → client.quit()` (`02-BUGS` B7).
- `enableShutdownHooks()` bor; `SIGTERM` → yangi so'rovlarni qabul qilmaslik → 10 s kutish → chiqish. Docker `stop_grace_period: 15s`.
- BullMQ: `@nestjs/bullmq` worker'larni `close()` qiladi (joriy job tugaydi). Uzun job'lar uchun `lockDuration` 60 s dan katta qilish.
- HTTP: `server.keepAliveTimeout` ni nginx `keepalive_timeout` dan katta qilish (502 oldini oladi).

---

## 6. Tracing (P3)

`@opentelemetry/sdk-node` + auto-instrumentation (http, express, pg, ioredis, bullmq) → Jaeger/Tempo. `traceId` pino logga.
Bir jarayon bo'lganida foyda kam; worker ajratilgach (`06-PERF` §8) kerak bo'ladi.

---

## 7. Audit va xavfsizlik loglari

Alohida `security` logger (pino `child({ scope: 'security' })`): login xato/muvaffaqiyat, token reuse, parol reset, permission rad (403),
rol o'zgarishi, admin yaratish. Bu loglar 90 kun saqlanadi (Loki retention). Foydalanuvchi ma'lumotlari — faqat `userId`, telefon/email emas.

---

## 8. Runbook (qisqa)

| Alomat | Tekshirish | Odatiy sabab |
|---|---|---|
| 429 ko'p | `throttler` konfiguratsiyasi, `trust proxy` | `02-BUGS` B2 |
| 401 `Session has been revoked` to'satdan | `refreshToken.revokedAt`, `Token reuse detected` logi | Frontend refresh'ni ikki marta yuborgan (race) → mijozda mutex |
| Rasm `PENDING` da qolib ketdi | `/metrics bullmq_queue_waiting`, Redis ulanishi, worker logi | Redis tushgan; recovery cron 1 daqiqada qaytaradi |
| 500 `Database error: P2024` | pool limit, `pg_stat_activity` | `connection_limit` kam / sekin so'rov |
| Email kelmayapti | `MAIL_TRANSPORT`, `email` navbati `failed` | SMTP kaliti |
| Disk to'ldi | `/health/ready` disk, `uploads/originals` hajmi | FAILED originallar tozalanmagan (`07-FILES` §5) |

---

## Env qo'shimchalari

`LOG_LEVEL`, `SENTRY_DSN`, `SENTRY_RELEASE`, `METRICS_ENABLED`, `METRICS_BASIC_AUTH` — Joi schema'ga.
