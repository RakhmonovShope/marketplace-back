# 00 — Audit xulosasi: hozirgi holat

> Sana: 2026-09-05. Tekshirilgan: 15 ta Nest moduli, 22 ta Prisma modeli, 32 ta migratsiya,
> Plop generator, `main.ts` bootstrap, build natijasi (`dist/`), `package.json` (55 dependency).
> `pnpm lint` va `pnpm build` — xatosiz o'tadi.

---

## 1. Loyiha nima

`marketplace-backend` — NestJS 10 + Prisma 5 + PostgreSQL + Redis + BullMQ asosidagi
**marketplace admin backend'i**. Hozircha faqat admin panel uchun CRUD (Category, Brand,
Store, Banner, Badge, Page, Role, Admin, File, Audio, Message, Car) va auth infratuzilmasi bor.
Mijoz tomoni (public katalog, savat, buyurtma, to'lov) **hali yozilmagan**, garchi
`Product`, `Order`, `Comment`, `Promocode`, `Promotion` modellari schema'da mavjud.

## 2. Kuchli tomonlar (saqlab qolinadi)

| Blok | Nima yaxshi |
|---|---|
| Auth | Refresh token rotation + **reuse detection**, `sid` bilan access tokenni sessiyaga bog'lash, email verification, reset password, token cleanup cron |
| RBAC | `PERMISSIONS` enum + `PermissionsGuard` + Redis cache (5 min) + `RoleService` da invalidatsiya |
| Rasm pipeline | Original diskka darhol yoziladi → Postgres'da holat → BullMQ job; **3 qatlamli durability**, recovery cron, idempotent processor, `sharp` sozlamalari (concurrency, cache, decompression-bomb himoyasi) |
| Bootstrap | Joi env validatsiya, `helmet`, CORS whitelist, URI versioning, global `ValidationPipe` (whitelist + forbid), `AllExceptionsFilter` (Prisma xatolarini map qiladi), `enableShutdownHooks` |
| Soft delete | `deletedAt` + `restore` endpointlari (User, Category, Store, Brand, Car) |
| Email | Handlebars template'lar, `console` / `smtp` rejimlari, BullMQ orqali retry |
| DX | Plop generator, `AGENTS.md` + `.cursor/rules`, conventional commits |

## 3. Kritik topilmalar (P0)

| # | Topilma | Fayl | Ta'sir |
|---|---|---|---|
| 1 | **`pnpm start:prod` ishlamaydi.** `tsconfig.build.json` da `include`/`rootDir` yo'q, `prisma/seed.ts` build'ga kiradi → chiqish `dist/src/main.js`, script esa `node dist/main` | `tsconfig.build.json`, `package.json` | Production deploy buziladi |
| 2 | **Privilege escalation.** Public `POST /v1/auth/signup` `roleId`, `subType`, `active` ni mijozdan qabul qiladi; super-admin `roleId` seed'da va repo'da ochiq | `auth.dto.ts`, `auth.service.ts:208` | Har kim super-admin bo'la oladi |
| 3 | **Parol hash'i API javobida.** `signUp`, `getMe`, `admin/:id`, `admin/pageable` Prisma `User` ni to'liq qaytaradi; `UserResponseDto` da `password` maydoni bor | `admin.dto.ts`, `admin.service.ts`, `auth.service.ts` | Hash sizishi |
| 4 | **Global throttler 10 req/min.** `ThrottlerModule` dagi `default` (10/60s) **barcha** route'larga, `@Throttle()` ustidan ham qo'llanadi (v6 da har bir named throttler alohida tekshiriladi) | `app.module.ts:53` | Admin panel 1 daqiqada 429 oladi |
| 5 | **WebSocket auth yo'q.** `ChatGateway` handshake'da tokenni tekshirmaydi, `receiverId` query'dan olinadi, `senderId` payload'dan — istalgan xonaga qo'shilib, istalgan nomdan xabar yozish mumkin | `chat.gateway.ts` | Chat to'liq ochiq |
| 6 | **SVG inline serve.** `/files/upload` SVG qabul qiladi (faqat mimetype bo'yicha), `/files/:y/:m/:d/:name` uni `inline` qaytaradi → backend origin'ida stored XSS | `file.controller.ts:97,270` | XSS |
| 7 | **Swagger production'da ochiq** (`/api`), auth yo'q | `main.ts` | Ichki API tuzilmasi oshkor |
| 8 | **`PAGE_SIZE` env validatsiyada yo'q.** Yo'q bo'lsa `perPage = NaN` → `take: NaN` → 500 | `env.validation.schema.ts` | Yangi muhitda pageable buziladi |
| 9 | **User enumeration.** `signIn` da user yo'q → 404, parol xato → 401 | `auth.service.ts:242` | Telefon raqamlar bazasini tekshirish mumkin |
| 10 | **`uploads/*.webp` git'da**, seed'da real telefon/email/hash | `.gitignore`, `prisma/seed.ts` | Repo gigiyenasi, PII |

Batafsil: `01-SECURITY.md`, `02-BUGS-AND-QUICK-FIXES.md`.

## 4. Muhim bo'shliqlar (P1)

- **Marketplace yadrosi yo'q**: `Product`, `Order`, `Comment`, `Promocode`, `Promotion`, `Attribute`,
  `AttributeOption` uchun modul yo'q; `Cart`, `OrderItem`, `Payment`, `Address`, `ProductVariant` modellari umuman yo'q.
- **Order ↔ Product bog'lanishi noto'g'ri**: `Product.orderId` → bitta mahsulot faqat bitta buyurtmada bo'la oladi.
- **Pul `Float`** (`Product.price`, `discount`) — yaxlitlash xatolari.
- **Public API yo'q**: barcha route'lar `AuthGuard + PermissionsGuard` ostida.
- **Test yo'q**: faqat boilerplate `test/app.e2e-spec.ts` (butun `AppModule` + real DB talab qiladi).
- **Docker/CI yo'q**: `Dockerfile`, `docker-compose.yml`, `.github/workflows`, `.env.example` — hech biri yo'q.
- **Loglar strukturasiz**: `Logger` matn, request id yo'q, `LoggingInterceptor` xatolarni log qilmaydi.
- **Filter whitelist yo'q**: `getWhereOperations` istalgan maydon nomini Prisma `where` ga o'tkazadi.
- **`getById` bir xil emas**: Banner/Badge/Page/Role/Car/Message `null` qaytaradi (200), boshqalari 404.
- **Message pageable**: `count()` filtersiz → `totalPages` noto'g'ri; generator template'ida ham shu bug.
- **AGENTS.md eskirgan**: `cache-manager` (olib tashlangan), `getAll()` (olib tashlangan), image endpointlari yo'q.

## 5. Raqamlar

| Ko'rsatkich | Qiymat |
|---|---|
| Nest modullari | 15 (`car`, `cron/example`, `badge/stream` — demo/test kodi) |
| Prisma modellari | 22 (8 tasi modulsiz, `TestModal` — keraksiz) |
| `init` nomli migratsiyalar | 9 (generator avtomatik `--name init` bilan yaratgan) |
| Unit testlar | 0 |
| Keraksiz dependency | `aws-sdk` v2, `chalk`, `node-plop`, `@nestjs/serve-static`, `dotenv`, `uuid`, `mkdirp` (oxirgi ikkisi Node'ning o'zida bor) |
| `console.log` | 6 joy (`role.service`, `chat.gateway`, `cron/example`, `badge.controller`) |

## 6. Tavsiya etilgan tartib

```
Hafta 1   P0: 01-SECURITY + 02-BUGS            → production'ga chiqishga tayyor
Hafta 2-3 P1: 10-DEVOPS + 08-OBSERVABILITY + 09-TESTING (skelet) + 04-API-CONVENTIONS
Hafta 3-4 P1: 03-DATA-MODEL (migratsiyalar)
Hafta 5-10 P1: 05-CORE-MARKETPLACE (Product → Catalog → Cart → Order → Payment)
Parallel  P2: 06-PERFORMANCE, 07-FILES, 11-UPGRADES, 12-DX
Doimiy    P3: 13-FEATURE-IDEAS dan tanlab olish
```

Qadamlar ketma-ketligi va DoD — `ROADMAP.md` da.
