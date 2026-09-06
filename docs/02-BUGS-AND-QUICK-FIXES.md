# 02 — Aniq buglar va tez tuzatishlar (P0)

> Har biri 5–30 daqiqalik ish. Barchasi koddan bevosita tasdiqlangan.

---

## B1. `pnpm start:prod` ishlamaydi — `dist/src/main.js`

> ✅ Bajarildi (2026-09-05, STEP-01): `tsconfig.build.json` `include: ["src/**/*"]` + `prisma` exclude,
> `multer-s3.d.ts` → `src/types/`, `MailService` faqat `__dirname/templates`. `node dist/main` → `/health` 200.

**Tasdiq.** `pnpm build` → `dist/` tarkibi: `dist/src/...`, `dist/prisma/seed.js`, `dist/common/mail/templates/`.
`package.json`: `"start:prod": "node dist/main"` → fayl yo'q.

**Sabab.** `tsconfig.build.json` da `include` yo'q; `prisma/seed.ts` ham kompilyatsiyaga kiradi,
TypeScript `rootDir` ni umumiy ildiz (`.`) deb oladi. `MailService.resolveTemplatesDir()` dagi
3 ta "ehtimoliy yo'l" aynan shu bugni yashirish uchun yozilgan.

**Yechim.**
```jsonc
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "prisma"]
}
```
- `multer-s3.d.ts` ni `src/types/multer-s3.d.ts` ga ko'chirish (`.d.ts` rootDir'ga ta'sir qilmaydi, lekin tartib uchun).
- Keyin `MailService` da faqat `join(__dirname, 'templates')` qoldirish.
- `nest-cli.json` `assets: ["**/*.hbs"]` — `sourceRoot: src` bilan to'g'ri ishlaydi.

**Tekshirish.** `pnpm build && node dist/main` → "App ishga tushdi".

---

## B2. Throttler: barcha endpointlar 10 req/min

> ✅ Bajarildi (2026-09-05, STEP-04): bitta `default` throttler (`THROTTLE_LIMIT`=300/min, `THROTTLE_TTL_MS`), auth route'larida `@Throttle({ default })` (signin 5/min, signup/forgot/resend 3/soat, verify/reset 10/min), `/health` va static `/files` `@SkipThrottle()`, `TRUST_PROXY` env (default 'false'). Tekshirildi: signin 6-urinish → 429, 60 ta boshqa so'rov → 429 yo'q. Redis storage — STEP-44.

**Tasdiq.** `app.module.ts`: `ThrottlerModule.forRoot([{name:'default', ttl:60_000, limit:10}, short, medium, long])`
+ `APP_GUARD: ThrottlerGuard`. `@nestjs/throttler` v6 da guard **har bir** named throttler'ni alohida
tekshiradi; `@Throttle({ short: … })` faqat `short` ni override qiladi, `default` (10/min) qoladi.

**Yechim.**
```ts
ThrottlerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (c) => ({
    throttlers: [
      { name: 'default', ttl: 60_000, limit: c.get('THROTTLE_LIMIT', 300) }, // umumiy: 300/min
    ],
    storage: new ThrottlerStorageRedisService(redisClient), // @nest-lab/throttler-storage-redis
  }),
}),
```
- Auth route'larida qat'iy: `@Throttle({ default: { limit: 5, ttl: 60_000 } })` (`signin`), `3/hour` (`signup`, `forgot`).
- Health/static fayl: `@SkipThrottle()`.
- `short/medium/long` nomli throttler'larni olib tashlash — ular hozir hech qanday foyda bermaydi.

---

## B3. Env schema to'liq emas

> ✅ Bajarildi (2026-09-05, STEP-05): `PAGE_SIZE` (default 20), `BCRYPT_ROUNDS` (12), `APP_NAME`, `REDIS_PASSWORD`, `IMAGE_CONCURRENCY`, `SWAGGER_ENABLED/USER/PASS`, `THROTTLE_*`, `TRUST_PROXY` Joi'ga qo'shildi; 10 ta servisda `config.get<number>('PAGE_SIZE', 20)`. B7 ham: `RedisModule.onApplicationShutdown → quit()`, `PrismaService.onModuleDestroy → $disconnect()`; `FileModule` dagi dublikat `PrismaService` provider olib tashlandi (ikkinchi pool yaratardi). Tekshirildi: PAGE_SIZE'siz pageable 200; SIGTERM'da ikkala ulanish yopiladi.

Kodda o'qiladi, lekin `env.validation.schema.ts` da yo'q:

| O'zgaruvchi | Qayerda | Default taklif |
|---|---|---|
| `PAGE_SIZE` | barcha `getAllByPage` (`Number(undefined)` → NaN → Prisma 500) | `Joi.number().min(1).max(100).default(20)` |
| `REDIS_PASSWORD` | `redis.module.ts` | `Joi.string().allow('').optional()` |
| `IMAGE_CONCURRENCY` | `image.processor.ts` (`process.env` orqali) | `Joi.number().min(1).optional()` |
| `APP_NAME` | `mail.service.ts` | `default('Marketplace')` |
| `FILE_BASE_PATH`, `SESSION_EXPIRATION` | `.env` da bor, kodda ishlatilmaydi | `.env` dan olib tashlash |

`perPage` uchun servislarda `Number(this.config.get('PAGE_SIZE'))` o'rniga
`this.config.get<number>('PAGE_SIZE', 20)` (Joi allaqachon number qiladi).

---

## B4. Message pageable: `count()` filtersiz, `getById` 404 bermaydi

> ✅ Bajarildi (2026-09-06, STEP-09): B4, B5 (badge/page/banner/role/car/message 404), B6 (`order` `@IsIn`, `toPrismaOrder` helper, `prisma` paketidan tip importi olib tashlandi), B8 (`@nestjs/swagger` PartialType/OmitType), B9 (15 ta GET/POST/PUT dekorator), B10 (`badges/stream`, `cron/example`, `console.log` — 0 ta), B12 (`code` + `errors[]`, `src/common/error-codes.ts`, 4xx warn / 5xx error), B13 (10 ta servisda `const { id, ...data } = payload`), B14 (migratsiya `drop_duplicate_token_hash_indexes`); S9: `/auth/me` (+`/get-me` alias) `AuthGuard` + `@CurrentUser`, `auth.guard.ts` o'chirildi, `createAdmin` → `ADMIN__CREATE`, `Role.delete` → 409 `SYSTEM_ROLE`/`ROLE_IN_USE`. Tekshirildi: 8 holat.

`message.service.ts:80`: `this.prisma.message.count()` → filter e'tiborga olinmaydi, `totalPages` noto'g'ri.
Boshqa servislar (`category`, `store`, …) allaqachon `$transaction([findMany, count({where})])` ishlatadi.
Bir xil qilish. `getById` `null` qaytarsa → `NotFoundException`.

Xuddi shu muammo **generator template'ida** (`Controller.service.ts.hbs`) — `12-CODEGEN-DX-DOCS.md`.

---

## B5. `getById` `null` bilan 200 qaytaradi

`banner`, `badge`, `page`, `role`, `car`, `message` servislarida `findUnique` natijasi tekshirilmaydi.
Barchasida:
```ts
const item = await this.prisma.banner.findUnique({ where: { id } });
if (!item) throw new NotFoundException('Banner not found');
```

---

## B6. `order` maydoni validatsiyasiz → 500

`PaginationFilterOrderRequest.order` faqat `@IsString()`; `'foo'.toLowerCase()` Prisma'ga ketadi → `PrismaClientValidationError` → 400 "invalid data format" (yaxshi emas, lekin 500 emas).
`import { SortOrder } from 'prisma'` — CLI paketidan tip import qilish mo'rt.
```ts
@IsIn(['ASC', 'DESC']) @IsOptional() order?: 'ASC' | 'DESC';
```

---

## B7. Graceful shutdown to'liq emas

- `RedisModule.onApplicationShutdown()` bo'sh → `await client.quit()`.
- `PrismaService` da `onModuleDestroy` yo'q → `await this.$disconnect()`.
- BullMQ worker'lar `@nestjs/bullmq` tomonidan yopiladi (OK).

---

## B8. Swagger metadata yo'qoladi — `@nestjs/mapped-types`

`admin.dto.ts`: `PartialType(OmitType(Create, ['password']))` `@nestjs/mapped-types` dan import qilingan →
Swagger'da `Update` sxemasi bo'sh. `@nestjs/swagger` dan import qilish kerak (u ham `PartialType`/`OmitType` beradi
va `@ApiProperty` metadata'ni saqlaydi). `role.controller.ts` dagi `PickType` ham shu.

---

## B9. `@ApiBody` GET endpointlarda

`category`, `store`, `page`, `badge`, `car`, `message` controller'larida `@Get(':id')` ga `@ApiBody({type: …Response})`
qo'yilgan — Swagger'da GET'ga body chizadi. `@ApiResponse({ type: …Response })` + `@ApiParam({ name: 'id' })` bo'lishi kerak.

---

## B10. Demo/test kodi production modulida

| Nima | Fayl | Qaror |
|---|---|---|
| `POST /v1/badges/stream` — `setInterval` bilan chunk stream demo, `BADGE__DELETE` permission bilan | `badge.controller.ts:85` | O'chirish |
| `CronService` har 10 soniyada `console.log` (AppModule'ga ulanmagan, lekin `cron/index.ts` eksport qiladi) | `src/api/cron/example` | O'chirish yoki real job modulga aylantirish |
| `console.log('<==========>', id)` | `role.service.ts:59` | O'chirish |
| `Car` moduli + `TestModal` modeli | `src/api/car`, `schema.prisma` | Migratsiya bilan o'chirish (03-DATA-MODEL) |

---

## B11. `LoggingInterceptor` xatolarni log qilmaydi

`tap(() => …)` faqat muvaffaqiyatli javobda ishlaydi; exception bo'lsa qator chiqmaydi, davomiylik yo'qoladi.
`tap({ next, error })` yoki `finalize()`; to'liq yechim — `08-OBSERVABILITY` (pino + request id).

---

## B12. `AllExceptionsFilter` faqat birinchi validatsiya xabarini qaytaradi

`Array.isArray(message) ? message[0] : message` — forma 5 ta xatoni bittalab ko'radi.
```ts
{ statusCode, code: 'VALIDATION_ERROR', message: messages[0], errors: messages, path, timestamp }
```
`code` maydoni — `04-API-CONVENTIONS.md` §4.

---

## B13. Prisma `update` ga `id` ham `data` sifatida ketadi

`data: payload` (`payload.id` ichida). Prisma `id` ni yangilashga ruxsat beradi (o'z qiymatiga), lekin
kelajakda `id` o'zgartirish xatosi bo'lishi mumkin. Har joyda:
```ts
const { id, ...data } = payload;
await this.prisma.category.update({ where: { id }, data });
```

---

## B14. `RefreshToken` da ortiqcha indeks

`tokenHash String @unique` allaqachon unique indeks yaratadi; `@@index([tokenHash])` dublikat — olib tashlash.
`VerificationToken` da ham xuddi shu.

---

## Bajarish tartibi (bitta PR'da bo'lishi mumkin: `fix: p0 quick fixes`)

B1 → B3 → B2 → B7 → B4 → B5 → B6 → B13 → B8 → B9 → B12 → B11 → B14 → B10.
Har biridan keyin `pnpm lint && pnpm build`.

---

## B15. Swagger sxema nomlari to'qnashadi (`Create`/`Update`/`PageableResponseDto`) — STEP-20

> Topildi 2026-09-06 (STEP-09 tekshiruvida). `components.schemas` da bitta `Update`, bitta `Create`,
> bitta `PageableResponseDto` qoladi — qaysi modulniki "oxirgi" bo'lsa o'sha. `openapi-typescript`
> uchun bu tiplarni yaroqsiz qiladi.

**Sabab.** `@nestjs/swagger` sxema nomini **sinf nomidan** oladi; loyihada har modul `export class Create`,
`export class Update`, `export class PageableResponseDto` (AGENTS.md §4.3 konvensiyasi).

**Yechim (konvensiyani buzmasdan).** Sinfni prefiks bilan nomlab, eski nomni alias sifatida eksport qilish —
`import * as CategoryDTO` + `CategoryDTO.Create` o'zgarmaydi, Swagger esa `CategoryCreate` ni ko'radi:
```ts
export class CategoryCreate { ... }
export class CategoryUpdate extends CategoryCreate { ... }
export class CategoryPageableResponse extends PageableDto { ... }
export { CategoryCreate as Create, CategoryUpdate as Update, CategoryPageableResponse as PageableResponseDto };
```
Generator template (`12-DX` §1) ham shu shablonga o'tadi. Bajarilishi — `ROADMAP.md` STEP-20.
