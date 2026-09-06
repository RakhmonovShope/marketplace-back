# 07 — DevOps, kuzatuv, CI/CD (P0/P1, barcha repolar)

> Hozir: Dockerfile + compose + nginx + CI (lint/build → ghcr `:latest`) hammasida bor; deploy skripti backend'da.
> Yo'q: ishlaydigan Sentry, metrikalar, uptime, backup, SHA tag'lar, e2e/DB'li CI, OpenAPI drift tekshiruvi.

---

## 1. Sentry — hozir hech narsa yubormaydi (P0)

> ✅ Bajarildi (2026-09-06, B2-05): `src/instrument.ts` — eng birinchi import, `Sentry.init` faqat DSN bilan (`APP_ENV`, `release=GIT_SHA` Dockerfile build-arg + CI, `beforeSend` header redaction); `HttpExceptionFilter`: 5xx → `captureException` (`requestId`/`path` teglari, user id) va javobda `requestId`; 5 ta BullMQ processor `@OnWorkerEvent('failed')` → `captureJobFailure`; `GET /health/boom` (`SENTRY_TEST_ROUTE=true` bo'lgandagina, aks holda 404). Tekshirildi: soxta ingest serverga event keldi (tags.requestId=smoke-req-1, release, env, authorization=[redacted]); DSN'siz hech narsa o'zgarmaydi. Frontend'lar — X2-01.

`main.ts`: `Sentry.init` `NestFactory.create` dan **keyin** (auto-instrumentation talabi buzilgan) va hech qayerda `captureException` yo'q →
prod'da 500 lar ko'rinmaydi. Yechim:
1. `src/instrument.ts` — eng birinchi import (`import './instrument'` `main.ts` boshida), `SENTRY_DSN` bo'lsa `Sentry.init({ dsn, environment: APP_ENV, release: GIT_SHA })`.
2. `HttpExceptionFilter`: `status >= 500` → `Sentry.captureException(exception, { extra: { requestId, path, userId } })`; `@sentry/nestjs` (`SentryModule.forRoot()`) yoki `@sentry/node` `setupNestErrorHandler`.
3. BullMQ processor `failed` → `captureException` (sync/import xatolari).
4. Frontend: web `@sentry/nextjs` (server + client, `tunnel` bilan adblock'dan o'tish), admin/miniapp `@sentry/react` (ErrorBoundary bor — `captureException` qo'shish). Release = git SHA (CI `build-args`).

---

## 2. Metrikalar va health (P1)

- **Prometheus** (`@willsoto/nestjs-prometheus`): `http_request_duration_seconds{route,status}`, `bullmq_queue_waiting{queue}`, `sync_jobs_total{provider,status}`, `search_requests_total{anon}`, `cache_hits_total{key}`; `/metrics` ichki tarmoq yoki basic auth.
- **Health**: `/health/live` (jarayon) va `/health/ready` (db, redis, disk `uploads`, heap, navbat backlog `sync` < 5 000) — compose `healthcheck` `ready` ga. Nest `HealthModule` da `MemoryHealthIndicator`, `DiskHealthIndicator` (terminus'da bor).
- **Uptime**: Better Uptime/UptimeRobot: `api/health`, web `/uz`, admin `/login`, mini app URL; Telegram'ga alert.
- **Grafana dashboard** (prom + loki): p95, 5xx, navbat, sync muvaffaqiyat %, kunlik faol foydalanuvchilar (SearchLog/ProfileView dan).

---

## 3. Docker va deploy (P1)

| Muammo | Fayl | Yechim |
|---|---|---|
| Runtime image `pnpm install --prod` qayta bajaradi (ikki marta install, sekin build) | backend `Dockerfile` | build stage'da `pnpm prune --prod` → `node_modules` ni ko'chirish; `prisma generate` build'da |
| Non-root user yo'q, HEALTHCHECK yo'q (compose'da bor) | Dockerfile (4 repo) | `USER node`, `HEALTHCHECK` |
| Alpine + Prisma engine (OpenSSL 3) — `openssl` paketi yo'q, `binaryTargets` yo'q | backend | `apk add openssl` + `binaryTargets = ["native","linux-musl-openssl-3.0.x","linux-musl-arm64-openssl-3.0.x"]` (prod'da tekshiring: `docker run … node -e "require('@prisma/client')"`) |
| `:latest` tag faqat → rollback yo'q | 4 ta `ci.yml` | `tags: ghcr.io/…:latest, ghcr.io/…:${{ github.sha }}`; `deploy.sh` `IMAGE_TAG` parametri |
| Deploy skripti `docker compose build` serverda (CPU) | `scripts/deploy.sh` | CI'dagi image'ni `pull` qilish; migratsiya alohida `run --rm app npx prisma migrate deploy` (bor) |
| nginx: gzip yo'q, `/files/` Nest orqali, rate limit yo'q | `nginx.conf` | `gzip on; gzip_types application/json`; `location /files/ { alias …; expires 1y; }`; `limit_req_zone` auth route'lariga |
| API va worker bitta konteyner | compose.prod | `worker` servisi (`WORKER_MODE=true`, `BOT_ENABLED=true`), `app` da `QUEUE_WORKERS_ENABLED=false`, `BOT_ENABLED=false` (`02-PERF` §9) |
| TLS | nginx | Cloudflare (proxy) yoki Caddy (auto TLS); Mini App HTTPS majburiy |

---

## 4. CI/CD (P1)

- Backend CI'ga **DB'li testlar**: `services: postgres:16, redis:7` → `prisma migrate deploy` → `pnpm test:e2e` (`08-TESTING`).
- `pnpm audit --audit-level=high` (xlsx/multer kabi) — 4 repo. `dependabot.yml` (haftalik, grouped).
- **OpenAPI drift**: backend CI `pnpm api:export` → `openapi/{admin,web,miniapp}.json` artefakt (server ishga tushmasdan `createDocument`); frontend CI `openapi-typescript <artefakt>` → `git diff --exit-code src/**/api-schema.d.ts` — kontrakt o'zgarsa PR'da ko'rinadi. Hozir tiplar lokal `localhost:3000` dan generatsiya qilinadi — CI tekshirmaydi.
- Frontend CI: `pnpm typecheck` admin'da yo'q (`build` ichida `tsc -b` bor — OK), miniapp'da bor; `oxlint` ham.
- Lighthouse CI (web): home + profil, budget (LCP 2.5 s, JS < 250KB).
- Deploy job: `environment: production` (manual approval), `ssh` → `IMAGE_TAG=sha docker compose pull && migrate && up -d`.

---

## 5. Backup va DR (P1)

- Postgres: `pg_dump -Fc` kunlik (compose `backup` servisi: `prodrigestivill/postgres-backup-local` yoki cron) → S3/R2, 30 kun; oyda bir `pg_restore` staging'ga.
- `uploads` volume: `rclone sync` S3/R2 kunlik (yoki fayllarni to'g'ridan-to'g'ri S3'ga yuklash — `08` P2).
- Redis: BullMQ job'lar — `appendonly yes` (compose'da yo'q → qo'shish); sync/import holati DB'da — yo'qolsa qayta navbatga.
- Sirlar: `.env` serverda `chmod 600`; GitHub Environments; `JWT_SECRET` rotatsiyasi jarayoni (ikkita secret qabul qilish — `JWT_SECRET_PREVIOUS`).

---

## 6. Muhitlar

| Muhit | Backend | Web | Admin | Mini App |
|---|---|---|---|---|
| dev | :3000, compose pg :5433 / redis :6380 | :3001 | :3003 | :3002 + tunnel |
| staging | `api-stg.<domain>` (`APP_ENV=staging`) | `stg.<domain>` | `admin-stg.` | alohida test bot (`/newapp`) |
| prod | `api.<domain>` | `<domain>` | `admin.<domain>` | `t.<domain>` |

Staging'siz Telegram oqimlarini (widget `/setdomain`, mini app URL) sinash qiyin — **alohida test bot** har muhit uchun.

---

## 7. Loglar

pino JSON → stdout → Docker → **Loki** (Grafana) yoki Better Stack. `redact` (`01` S3). Xavfsizlik loglari (`child({ scope: 'security' })`): login xato/OK, token theft, block, permission rad — 90 kun. `userId` customProps.

---

## 8. Fayllar (P2)

`uploads/` volume → S3-mos (R2/MinIO): `StorageProvider` (local|s3), `File.path` nisbiy + URL o'qishda (`PUBLIC_URL`/CDN), variantlar S3'ga, `Cache-Control immutable`, CDN (Cloudflare). Web `remotePatterns` CDN host.

---

## Env qo'shimchalari

`TRUST_PROXY`, `SWAGGER_ENABLED`, `SWAGGER_USER/PASS`, `APP_ENV`, `SENTRY_RELEASE`, `QUEUE_WORKERS_ENABLED`, `METRICS_ENABLED`, `STORAGE_DRIVER`, `S3_*`, `JWT_SECRET_PREVIOUS` — `env.validation.ts` + `.env.example`.
