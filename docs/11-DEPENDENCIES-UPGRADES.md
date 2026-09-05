# 11 — Dependency'lar va yangilanishlar (P2)

> Tekshirilgan: `package.json` + `node_modules` versiyalari (2026-09-05).
> Nest 10.4.1, Prisma 5.19.1, TS 5.6.2, ESLint 8.57, sharp 0.35.2, bullmq 5.79, multer 1.4.5-lts.1.

---

## 1. Olib tashlanadigan paketlar (kodda ishlatilmaydi)

| Paket | Sabab | Buyruq |
|---|---|---|
| `aws-sdk` (v2, ~90MB) | Faqat `@aws-sdk/client-s3` v3 ishlatiladi | `pnpm remove aws-sdk` |
| `chalk` | Hech qayerda import yo'q | `pnpm remove chalk` |
| `node-plop` | `plop` devDependency o'zi olib keladi | `pnpm remove node-plop` |
| `@nestjs/serve-static` | Import yo'q (fayllar custom controller orqali) | `pnpm remove @nestjs/serve-static` |
| `dotenv` | `@nestjs/config` `.env` ni o'zi o'qiydi | `pnpm remove dotenv` |
| `uuid` | Node 19+ `crypto.randomUUID()` | `pnpm remove uuid` + 3 ta import almashtirish |
| `mkdirp` | `fs.promises.mkdir(path, { recursive: true })` | `pnpm remove mkdirp` + 2 ta joy |
| `multer-s3` | Storage abstraksiyasi (`07-FILES` §2) kelgach | keyin |

`dependencies` → `devDependencies` ga: `prisma` (CLI), `@types/bcrypt`, `@types/multer`.
Natija: image ~150MB yengil, `pnpm install` tezroq.

---

## 2. Xavfsizlik yangilanishlari (birinchi)

| Paket | Hozir | Muammo | Yechim |
|---|---|---|---|
| `multer` | 1.4.5-lts.1 | 2025 advisory'lari (DoS: `CVE-2025-47935`, `CVE-2025-47944`, `CVE-2025-48997`) | `multer@2.x` — `@nestjs/platform-express` 11 bilan mos; 10.x da `pnpm.overrides` |
| `express` | 4.x (Nest 10 orqali) | 4.19+ da tuzatilgan `path-to-regexp`/`send` masalalari | Nest 11 → Express 5 (yoki 4.21+) |
| `bcrypt` | 5.1 | native build; `@types/bcrypt` 6 bilan versiya nomuvofiq | `bcrypt@6` yoki `argon2` |

`pnpm audit --audit-level=high` CI'da (`09-TESTING` §7).

---

## 3. NestJS 10 → 11

Qo'shimcha paketlar allaqachon 11-mos (`@nestjs/bullmq` 11, `terminus` 11, `schedule` 5, `event-emitter` 3, `throttler` 6 — peer `^10 || ^11`).
Yadro (`common`, `core`, `platform-express`, `platform-socket.io`, `websockets`, `jwt`, `passport`, `swagger`, `config`, `mapped-types`, `cli`, `schematics`, `testing`) → 11.

Diqqat qilinadigan o'zgarishlar:
- Express 5: route pattern (`*` → `{*path}`), `req.query` getter — `@Query()` ishlatilgan, muammo yo'q.
- `@nestjs/config` 4: `ConfigModule.forRoot` `cache: true` default yaqin; `validationSchema` xuddi shu.
- `@nestjs/swagger` 8/11: `PartialType` metadata to'g'ri (`02-BUGS` B8 bilan birga).
- Lifecycle hook'lar tartibi o'zgargan (module init parallel emas) — `ImageQueueService.onModuleInit` (recover) va `MailService.onModuleInit` mustaqil, muammo yo'q.
- `reflect-metadata` 0.2 — allaqachon.

Tartib: `pnpm up "@nestjs/*@11"` → `pnpm build` → e2e → `multer@2`.

---

## 4. Prisma 5.19 → 6.x (keyin 7 alohida baholanadi)

- 6.x: `omit` GA (`01-SECURITY` S2 uchun kerak), `relationJoins` GA, `fullTextSearchPostgres` preview, Node 18.18+ / TS 5.1+ — mos.
- Buzuvchi: `Buffer` → `Uint8Array` (`Bytes` maydon yo'q — ta'sir yo'q), implicit m:n jadval nomlari (ishlatilmaydi), `@prisma/client` `$on('beforeExit')` o'chirilgan (ishlatilmaydi).
- 7.x: yangi `prisma-client` generator (`output` majburiy), `prisma.config.ts`, `engine`siz Rust-free client — katta o'zgarish, alohida PR; 6 barqaror bo'lgach.
- `prisma validate` hozir yashil; `migrate diff` bilan drift tekshiruvi.

---

## 5. Tooling

| Paket | Hozir | Maqsad | Izoh |
|---|---|---|---|
| `eslint` | 8.57 (EOL 2024-10) | 9.x flat config (`eslint.config.mjs`) | `typescript-eslint` 8 allaqachon; `eslint-plugin-prettier` 5 mos |
| `typescript` | 5.6 | 5.9 | `nest build` mos; `isolatedModules` ts-jest |
| `prettier` | 3.x | 3.6+ | — |
| `jest`/`ts-jest` | 29 | 30 | yoki `@swc/jest` (tezlik) |
| `pnpm` | 8.12 | 9/10 | `corepack use pnpm@9` |
| `plop` | 4 | — | qoladi |

---

## 6. Runtime kutubxonalar

| Paket | Izoh |
|---|---|
| `sharp` 0.35 | joriy; `.avif` bor. `package.json` `exports` `./package.json` ni bermaydi — versiya `pnpm list sharp` bilan |
| `bullmq` 5.79 | joriy; `@nestjs/bullmq` 11 bilan mos |
| `ioredis` 5.4 | joriy; `@nest-lab/throttler-storage-redis`, `@socket.io/redis-adapter` shu client'ni oladi |
| `socket.io` 4.8 | joriy |
| `joi` 18 | joriy; alternativ `zod` (frontend bilan bir xil) — shart emas |
| `handlebars` 4.7 | joriy; `noEscape` ishlatilmaydi — XSS yo'q |
| `nodemailer` 8 | joriy |
| `helmet` 8 | joriy |
| `class-validator` 0.14 / `class-transformer` 0.5 | joriy |

Yangi qo'shiladiganlar (hujjatlar bo'yicha): `nestjs-pino pino-http pino-pretty`, `@sentry/nestjs`, `@willsoto/nestjs-prometheus prom-client`,
`@nest-lab/throttler-storage-redis`, `@socket.io/redis-adapter`, `file-type`, `express-basic-auth`, `nestjs-i18n`, `decimal.js` (Prisma bilan keladi),
dev: `jest-mock-extended`, `ioredis-mock`, `@testcontainers/postgresql`, `@faker-js/faker`, `husky lint-staged @commitlint/cli @commitlint/config-conventional`, `openapi-typescript` (frontend).

---

## 7. Tartib (xavf bo'yicha)

1. §1 olib tashlash + dev/prod ajratish (xavfsiz, darhol).
2. `multer@2` override (xavfsizlik).
3. ESLint 9 + husky (DX).
4. Nest 11 (bitta PR, e2e bilan).
5. Prisma 6 (bitta PR, `omit` bilan S2 ni yakunlash).
6. Node pin + pnpm 9 (Docker bilan birga, `10-DEVOPS` §1).
7. Prisma 7 — 2027 boshida qayta ko'rish.
