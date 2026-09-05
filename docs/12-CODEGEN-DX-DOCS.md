# 12 — Generator, DX va hujjatlar (P2)

> `tools/generators/` (Plop), `AGENTS.md`, `.cursor/rules`, `README.md`, Swagger, skriptlar.

---

## 1. Plop generator: buglar va xavfli xatti-harakat

`tools/generators/index.js`:
- **Avtomatik `prisma migrate dev --name init`** — shuning uchun 9 ta `init` migratsiya bor. Olib tashlash; migratsiya nomi — alohida qadam (`pnpm prisma migrate dev --name add_<entity>`), `AGENTS.md` §5 shunday deydi, generator esa aksini qiladi.
- `models.json` bilan solishtirish `m.name` bo'yicha, lekin JSON'da string'lar → `!existingModels.some((m) => m.name === model.name)` **har doim true** → "yangi model" deb har safar oxirgi modelni oladi. `m === model.name` bo'lishi kerak.
- `extractFields` regex `(\w+)\s+(\w+)` — `@relation`, `@default`, enum, `?`, `[]` ni tushunmaydi; `Decimal`, `Json`, enum → `'string'`. Prisma DMMF ishlatish: `require('@prisma/internals').getDMMF({ datamodel })` — aniq tiplar, `isRequired`, `isList`, `kind: 'enum'|'object'`.
- Relation maydonlari (`Category Category?`) DTO'ga kirmasligi kerak; `createdAt/updatedAt/deletedAt/id` ham.

`templates/crud/*.hbs`:
| Template | Bug | Tuzatish |
|---|---|---|
| `Controller.service.ts.hbs` | `count()` filtersiz; `findMany` + `count` alohida (transaction yo'q); `getById` 404 yo'q; hard delete; `getAll()` (`AGENTS.md` da olib tashlangan) | `category.service.ts` ni eталон qilib qayta yozish: `$transaction`, `deletedAt`, `restore`, `NotFoundException`, `*.query.ts` whitelist |
| `Controller.controller.ts.hbs` | `@ApiBody` GET'da; `GET /` (`getAll`) endpoint; `restore` yo'q | `category.controller.ts` asosida; `@ApiParam`, `@ApiResponse` 4xx, `PATCH :id/restore` |
| `Controller.dto.ts.hbs` | `Update extends Create` (OK), lekin `@IsOptional` yo'q maydonlar, enum → string | DMMF asosida `@IsEnum`, `@IsOptional` (`?`), `@IsArray` (`[]`), `Uz/Ru` juftligi tekshiruvi (bittasi bo'lsa xato) |
| `index.js` (actions) | `auth.enum.ts` ga `__RESTORE` qo'shilmaydi; `prisma/seed.ts` ga permission'lar qo'shilmaydi | 5 ta permission + seed'dagi super-admin ro'yxatiga append |

`models.json` — hozir modulsiz modellar (`Product`, `Order`, …) ham bor → tozalash: faqat moduli borlar. Yoki umuman `models.json` o'rniga `src/api/<name>` papkasi mavjudligini tekshirish (haqiqat manbai — fayl tizimi).

---

## 2. Yangi skriptlar (`package.json`)

```jsonc
"typecheck": "tsc --noEmit -p tsconfig.build.json",
"typecheck:strict": "tsc --noEmit -p tsconfig.strict.json",
"start:worker": "node dist/worker",
"api:export": "ts-node -r tsconfig-paths/register src/swagger/export.ts",
"db:migrate": "prisma migrate dev",
"db:deploy": "prisma migrate deploy",
"db:studio": "prisma studio",
"db:reset": "prisma migrate reset --force && pnpm seed",
"env:check": "node tools/check-env-example.js",
"prepare": "husky"
```
`migrate:seed` `npx prisma` ishlatadi → `prisma` (pnpm bin) — `npx` kerak emas.

---

## 3. `.env.example` va tekshiruv

`tools/check-env-example.js`: `env.validation.schema.ts` dan kalitlarni (regex `^\s+(\w+):\s*Joi`) o'qib, `.env.example` da yo'qlarini chiqaradi, `exit 1`. CI'da (`10-DEVOPS` §6).
`.env.example` bo'limlari: App, Database, JWT, Redis, Storage, Mail, CORS, Throttle, Swagger, Observability, Seed, Payment (keyin).

---

## 4. `AGENTS.md` yangilanishi (eskirgan joylar)

| Bo'lim | Hozir | To'g'ri |
|---|---|---|
| §1 Cache | `cache-manager`, `ioredis` | faqat `ioredis` (`REDIS_CLIENT` provider) |
| §1 Storage | "S3 audio, disk rasm" | `StorageProvider` (`07-FILES`) qabul qilingach |
| §2 struktura | `src/common/common.dto.ts`, `helpers/` | + `common/{redis,mail,logging,http-exception,env}`, `api/file/{image.*,image-queue}`, `*.query.ts` |
| §4.4 route'lar | `GET /<resource>` (`getAll`) | olib tashlangan (commit 8831dcc); `PATCH :id/restore` qo'shilgan; `POST /files/image` async |
| §4.5 | `delete` `'deleted'` qaytaradi (admin) | bir xil: `boolean`/204 |
| §4.6 | 4 ta permission | 5 (`__RESTORE`), seed'ga qo'shish majburiy |
| §4.7 | `active Boolean @default(false)` | + `deletedAt DateTime?` soft-delete modellarida; `Decimal` pul uchun |
| §3 buyruqlar | — | `typecheck`, `test`, `api:export`, `start:worker`, docker compose |
| §5 workflow | generator migratsiyani o'zi bajaradi (aslida `init` bilan) | generator migratsiya **qilmaydi**; nom qo'lda |
| §7 havolalar | `cron/example` | real cron (token cleanup `auth.service.ts`, recovery `image-queue.service.ts`) |
| Yangi §8 | — | `docs/` papkasi: audit, roadmap, konvensiyalar v2 |

`.cursor/rules/services.mdc`, `controllers.mdc`, `dtos.mdc` — `category` etalon asosida `restore`, `$transaction`, `NotFoundException`, `*.query.ts`, mapper qoidalari.
`CLAUDE.md` TL;DR: "Har modul = 5 fayl" → "6 fayl (`*.query.ts` bilan)", `pnpm typecheck` qo'shish.

---

## 5. `README.md`

Hozir — Nest boilerplate. Kerak: loyiha nima, talablar (Node/pnpm/Docker), 5 qadamda ishga tushirish (`cp .env.example .env` → `docker compose up -d` → `pnpm install` → `pnpm db:migrate && pnpm seed` → `pnpm start:dev`), Swagger manzili, `docs/` havolasi, deploy qisqacha.

---

## 6. Swagger sifat va OpenAPI export

`src/swagger/swagger.setup.ts` — `main.ts` dan ajratish: uchta definition (`admin`, `app`, `auth`) (`04-API` §1), `swaggerOptions: { persistAuthorization: true }`, `operationIdFactory` (`controllerKey_methodKey` → frontend'da toza funksiya nomlari).
`src/swagger/export.ts` — hujjatlarni `openapi/*.json` ga yozadi (server ishga tushmasdan, `app.init()` siz `createDocument` yetarli).
Frontend: `openapi-typescript openapi/admin.json -o src/api/admin.d.ts` (influencer loyihasidagi `pnpm api:gen` bilan bir xil).

---

## 7. IDE

- `.vscode/launch.json` (`start:debug` bilan attach), `.vscode/extensions.json` (Prisma, ESLint, Prettier).
- `.idea/` git'da **emas** (tekshirildi: `git ls-files .idea` bo'sh) — OK. `uploads/` esa tracked (`01-SECURITY` S8).
- Prettier `printWidth: 80` default — uzun `@ApiProperty` qatorlarini ko'p sindiradi; `100` (jamoa qarori).

---

## 8. Hujjatlar tartibi

- `docs/` — bu papka (audit + rejalar). Bajarilgan hujjat bandi → `ROADMAP.md` da `[x]`, hujjat ichida "✅ bajarildi (sana, PR)".
- `BACKEND_BILIM_ROADMAP_UZ.md` — o'quv yo'l xaritasi; undagi ✅ belgilar bilan kod farqi bor (masalan "Cursor-based pagination ✅" — kodda offset). Uni `docs/LEARNING-PATH.md` ga ko'chirib, statuslarni `ROADMAP.md` ga bog'lash.
- `influencer-platform-docs/`, `seatmap-clone-knowledge-base.md`, `Influencerlar va blogerlar platformasi.md` — bu repo'ga tegishli emas; alohida `knowledge/` repo'ga yoki tegishli loyihalarga ko'chirish (repo ildizi toza bo'ladi, `AGENTS.md` chalg'imaydi).
