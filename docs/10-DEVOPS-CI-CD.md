# 10 — DevOps, CI/CD, deploy (P1)

> Hozir: `Dockerfile`, `docker-compose.yml`, `.github/`, `.env.example`, `.nvmrc` — yo'q.
> Lokal: Node 24.11, pnpm 8.12, Homebrew Postgres 16. Deploy jarayoni hujjatlanmagan.

---

## 1. Node va pnpm pin

- `.nvmrc`: `22` (LTS; Node 24 ham ishlaydi, lekin `sharp`/`bcrypt` prebuilt'lari LTS'da barqaror). `package.json` `engines: { node: ">=22 <25", pnpm: ">=9" }`.
- `packageManager: "pnpm@9.x"` (corepack). pnpm 8 → 9 (lockfile v9; `pnpm install` bir marta lockfile'ni yangilaydi).

---

## 2. Dockerfile (multi-stage)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build \
 && pnpm prune --prod

FROM node:22-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/health/ready || exit 1
CMD ["node", "dist/main"]
```
- `.dockerignore`: `node_modules, dist, uploads, .env*, .git, .idea, coverage, docs, *.md`.
- `dist/main` ishlashi uchun avval `02-BUGS` B1 (tsconfig.build) tuzatiladi.
- `sharp` alpine'da musl prebuilt — OK; `bcrypt` native build kerak bo'lsa `apk add python3 make g++` deps bosqichida (yoki `bcryptjs`).
- Worker uchun xuddi shu image, `CMD ["node","dist/worker"]` (`06-PERF` §8).

---

## 3. docker-compose (dev)

```yaml
services:
  postgres: { image: postgres:16-alpine, ports: ["5432:5432"], environment: { POSTGRES_DB: marketplace, POSTGRES_USER: app, POSTGRES_PASSWORD: app }, volumes: [pgdata:/var/lib/postgresql/data], healthcheck: { test: ["CMD-SHELL","pg_isready -U app"], interval: 5s } }
  redis:    { image: redis:7-alpine, ports: ["6379:6379"], command: ["redis-server","--appendonly","yes"], volumes: [redisdata:/data] }
  minio:    { image: minio/minio, command: server /data --console-address ":9001", ports: ["9000:9000","9001:9001"], environment: { MINIO_ROOT_USER: minio, MINIO_ROOT_PASSWORD: minio12345 }, volumes: [miniodata:/data] }
  mailpit:  { image: axllent/mailpit, ports: ["8025:8025","1025:1025"] }   # SMTP dev: MAIL_TRANSPORT=smtp SMTP_HOST=localhost SMTP_PORT=1025
volumes: { pgdata: {}, redisdata: {}, miniodata: {} }
```
`docker-compose.prod.yml`: `api` (2 replica), `worker`, `nginx`, `postgres` (yoki managed), `redis`. `.env` faylini image'ga qo'ymaslik — `env_file`.

---

## 4. `.env.example`

Joi schema'dagi **barcha** kalitlar, qiymatsiz yoki dev default bilan; izohlar (`env.validation.schema.ts` dagi kabi). CI'da tekshiruv:
`node -e "…"` skript — schema kalitlari ⊆ `.env.example` kalitlari, aks holda fail (`12-DX` §3).

---

## 5. Migratsiya strategiyasi

- Dev: `pnpm prisma migrate dev --name <aniq_nom>` (generator avtomatik `init` **bermaydi** — `12-DX` §1).
- Prod: deploy'dan **oldin** alohida job: `pnpm prisma migrate deploy` (container'da `node_modules/.bin/prisma migrate deploy`), keyin yangi image.
  Bitta instans bo'lsa `CMD ["sh","-c","prisma migrate deploy && node dist/main"]` ham bo'ladi; 2+ instansda — alohida job (poyga bo'lmasin).
- Buzuvchi o'zgarish: **expand → deploy code → backfill → contract** (masalan `Float→Decimal`: yangi ustun, ikkalasiga yozish, ko'chirish, eski ustunni keyingi relizda o'chirish).
- Har migratsiya PR'ida `migration.sql` ko'rib chiqiladi (`DROP`, `NOT NULL` qo'shish — alohida diqqat).
- `prisma migrate status` — CI'da schema va migratsiyalar mosligi (`--exit-code`).

---

## 6. GitHub Actions

`.github/workflows/ci.yml` (PR va `master`):
```
jobs:
  check:   pnpm install --frozen-lockfile → prisma generate → lint → typecheck → test (unit) → build → api:export diff
  e2e:     services: postgres:16, redis:7 → migrate deploy → test:e2e
  docker:  (faqat master) build → push ghcr.io/<org>/marketplace-backend:<sha>,latest
  deploy:  (faqat master, environment: production, manual approval) → ssh: docker compose pull && migrate && up -d
```
Cache: `pnpm/action-setup` + `actions/setup-node` `cache: pnpm`. Sirlar: GitHub Environments. `dependabot.yml` — haftalik, `pnpm`.

---

## 7. Nginx (reverse proxy)

```nginx
server {
  listen 443 ssl http2; server_name api.example.uz;
  client_max_body_size 12m;
  location /files/ { alias /srv/uploads/files/; expires 1y; add_header Cache-Control "public, immutable"; add_header X-Content-Type-Options nosniff; }
  location /socket.io/ { proxy_pass http://api; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
  location / { proxy_pass http://api; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Request-Id $request_id; gzip on; }
}
upstream api { server api1:3000; server api2:3000; keepalive 32; }
```
Nest: `trust proxy` (`01-SECURITY` S9). TLS — Let's Encrypt (`certbot`) yoki Caddy (avtomatik).

---

## 8. Backup va tiklash

- Postgres: `pg_dump -Fc` har kuni 03:00 (cron container yoki managed snapshot), S3 ga (`aws s3 cp`), 30 kun saqlash; **haftada bir** tiklashni sinash (`pg_restore` staging'ga).
- Redis: sessiya cache/throttler — yo'qolsa muammo emas; BullMQ job'lar — `appendonly yes` (durability `07-FILES` pipeline'i baribir DB'dan tiklaydi).
- Fayllar: S3 versioning yoki `rclone sync uploads/ s3:bucket` kunlik.
- Sirlar: GitHub Secrets / Doppler / SSM; `.env` serverda `chmod 600`.

---

## 9. Muhitlar

| Muhit | Maqsad | Ma'lumot |
|---|---|---|
| `development` | lokal, compose | seed |
| `staging` | prod nusxasi, k6 yuk testi, migratsiya sinovi | anonimlashtirilgan prod dump |
| `production` | | backup |

`NODE_ENV` Joi'da bor; `APP_ENV=staging` qo'shish (`NODE_ENV=production` bilan birga — Sentry `environment` uchun).

---

## 10. Deploy checklist (har reliz)

- [ ] CI yashil, `openapi/` diff frontend bilan kelishilgan
- [ ] Migratsiya `migration.sql` ko'rib chiqildi, staging'da o'tdi
- [ ] Yangi env kalitlari prod'da o'rnatildi (`.env.example` diff)
- [ ] `migrate deploy` → image yangilash → `/health/ready` 200 → smoke test (`signin`, `pageable`, `files/image`)
- [ ] Sentry'da yangi release, Grafana'da 15 daqiqa kuzatuv
- [ ] Rollback rejasi: oldingi image tag; migratsiya contract bosqichi keyingi relizda
