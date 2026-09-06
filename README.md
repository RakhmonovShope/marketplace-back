# marketplace-backend

NestJS 10 + Prisma 5 + PostgreSQL + Redis + BullMQ asosidagi marketplace backend'i:
admin CRUD (kategoriya, brend, do'kon, banner, badge, sahifa, rol, admin), JWT auth
(refresh rotation, email tasdiqlash, parol tiklash), permission-based RBAC, async rasm
pipeline (sharp + BullMQ), chat (Socket.IO), Swagger.

## Talablar

| Vosita | Versiya |
|---|---|
| Node.js | 22 yoki 24 (`.nvmrc`) |
| pnpm | 8.x (`packageManager`) |
| PostgreSQL | 16 |
| Redis | 7 |

Docker bo'lsa: `docker compose up -d` — Postgres, Redis, MinIO, Mailpit (`docs/10-DEVOPS-CI-CD.md`).

## Ishga tushirish

```bash
cp .env.example .env            # qiymatlarni to'ldiring (DATABASE_URL, JWT_*)
pnpm install
pnpm prisma migrate deploy      # yoki dev'da: pnpm prisma migrate dev
SEED_ADMIN_PHONE=998901234567 SEED_ADMIN_PASSWORD='StrongPass123' pnpm seed
pnpm start:dev                  # http://localhost:3000, Swagger: /api
```

Health: `GET /health`. API prefiksi: `/v1/...` (fayllar `/files/...`, health — prefikssiz).

## Buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `pnpm start:dev` | watch rejimi |
| `pnpm build` | `prisma generate` + `nest build` → `dist/main.js` |
| `pnpm start:prod` | `node dist/main` |
| `pnpm lint` / `pnpm format` | ESLint (--fix) / Prettier |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:e2e` | Jest unit / e2e |
| `pnpm seed` | rollar + super-admin (`SEED_ADMIN_*` env) — idempotent |
| `pnpm env:check` | Joi schema ↔ `.env.example` mosligi |
| `pnpm generate` | Plop: yangi Prisma modeli uchun CRUD moduli |

## Hujjatlar

- [`AGENTS.md`](./AGENTS.md) — kod konvensiyalari (modul tuzilmasi, DTO, permissions, Prisma).
- [`docs/README.md`](./docs/README.md) — audit, xavfsizlik, optimizatsiya va feature rejalari;
  [`docs/ROADMAP.md`](./docs/ROADMAP.md) — qadam-baqadam ish rejasi.

## Tuzilma (qisqa)

```
src/api/<feature>/   controller | service | module | dto | index  (+ mapper/gateway/processor)
src/common/          env schema, exception filter, error codes, redis, mail, socket adapter
src/prisma/          PrismaService (global)
prisma/              schema.prisma, migrations/, seed.ts
docs/                audit va roadmap
```

## Muallif

Shohboz Rahmonov — [GitHub](https://github.com/RakhmonovShope) · [LinkedIn](https://www.linkedin.com/in/rakhmonovshope/)
