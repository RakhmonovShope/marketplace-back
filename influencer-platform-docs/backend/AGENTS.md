# AGENTS.md — influencer-backend

> Bu repo uchun agent qo'llanmasi. Ish boshlashdan oldin `docs/00-CONTEXT-AND-DECISIONS.md`
> va `docs/01-ARCHITECTURE.md` o'qilishi shart.

## Stack

- NestJS 10 (Express, REST)
- TypeScript 5, CommonJS, `target: ES2021`, `baseUrl: "src"`
- PostgreSQL 16 + Prisma 5
- Redis (kesh, OTP, kvota) + BullMQ (navbatlar)
- Passport JWT + permission-based RBAC
- Swagger — uchta definition (ADR-009)
- **Paket menejeri: pnpm** (npm/yarn ishlatilmaydi)

## Buyruqlar

```bash
pnpm install
pnpm start:dev                      # watch rejim
pnpm build                          # prisma generate + nest build
pnpm lint                           # eslint --fix
pnpm format                         # prettier
pnpm test                           # unit
pnpm prisma migrate dev --name <x>  # migratsiya
pnpm seed                           # prisma/seed.ts
pnpm generate                       # Plop CRUD generator
docker compose up -d                # postgres + redis
```

**Har bir qadam oxirida majburiy:** `pnpm lint && pnpm build`

## Modul strukturasi (majburiy)

Har bir feature moduli aynan shu fayllardan iborat:

```
src/api/<feature>/
  <feature>.module.ts
  <feature>.controller.ts          # /app/** yoki /public/**
  <feature>.admin.controller.ts    # /admin/**  (agar admin CRUD bo'lsa)
  <feature>.service.ts
  <feature>.dto.ts
  index.ts                         # reeksport
  [<feature>.enum.ts]
  [<feature>.filterable.ts]        # qidiriladigan modullar uchun
```

**Admin va app kontrollerlari alohida fayllarda** — Swagger bo'linishi shunga tayanadi.

## Konvensiyalar

### DTO
```ts
import * as InfluencerDTO from './influencer.dto';
```
Har bir DTO faylida: `Create`, `Update extends PartialType(Create)`, `<Feature>Response`,
`PageableResponseDto`. Har bir maydon `@ApiProperty()` + `class-validator` dekoratori bilan.

### Kontroller
```ts
@ApiTags('Influencer (admin)')
@ApiBearerAuth()
@Controller('admin/influencers')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class InfluencerAdminController {
  @Post('search')
  @Permissions(PERMISSIONS.INFLUENCER__VIEW)
  @ApiOperation({ summary: 'Influencerlar ro\'yxati (filter/sort)' })
  search(@Body() query: QueryRequestDto) { ... }
}
```

### Servis
```ts
@Injectable()
export class InfluencerService {
  private readonly logger = new Logger(InfluencerService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
}
```

### Prisma
- Faqat `PrismaService` orqali. Qo'lda SQL — faqat migratsiyada.
- `include`/`select` doim aniq yoziladi — `include: { *: true }` taqiqlanadi.
- N+1 ni oldini olish: ro'yxat so'rovlarida `include` bilan bitta so'rovda olinadi.

## Qat'iy qoidalar (buzilmaydi)

1. **`StatsService.applyStats()` — statistikaning yagona kirish nuqtasi.**
   `prisma.socialAccountStats.update()` ni boshqa joyda chaqirish taqiqlanadi (ADR-005).
2. **Statistika o'zgargach `InfluencerAggregateService.recalculate()` chaqiriladi** (ADR-007).
3. **Har bir statistika yangilanishi snapshot yozadi** (ADR-006).
4. **Filterlanadigan maydon `FILTERABLE_FIELDS` oq ro'yxatida bo'lishi shart** (ADR-003).
5. **Lokalizatsiyalangan maydon doim juft:** `...Uz` va `...Ru` (ADR-011).
6. **Analytics maydonlarini yashirish faqat interceptor/serializer darajasida**,
   kontroller ichida `if (plan === ...)` yozish taqiqlanadi (ADR-008).
7. **OTP kodi ochiq saqlanmaydi** — faqat bcrypt hash.
8. **Admin route'lar `/admin/` prefiksisiz yozilmaydi** — Swagger bo'linishi buziladi.
9. **Foiz va pul — `Decimal`, hech qachon `Float`.**
10. `dist/`, `node_modules/`, `prisma/migrations/` ichida kod yozilmaydi.

## Xatolik va javob formati

Barcha xatolar `HttpExceptionFilter` orqali `{statusCode, code, message, details, timestamp, path}`
ko'rinishida. `code` — `src/common/error-codes.ts` dagi konstanta
(`03-API-CONTRACT.md` §9 ga qarang).

## Test

- `analytics.formulas.ts` — 100% unit test bilan qoplanadi (sof funksiyalar)
- `query-builder.ts` — filter kombinatsiyalari uchun testlar
- `validate-init-data.ts` — to'g'ri/noto'g'ri imzo testlari
- Boshqa joylarda test ixtiyoriy (MVP tezligi uchun)

## Nima qilinmaydi

- Scraping kodi yozilmaydi (ADR: faqat rasmiy API / qonuniy provayder)
- `pnpm-lock.yaml` qo'lda tahrirlanmaydi
- `.env`, `dist/`, `uploads/` commit qilinmaydi
- Bir qadamda bir nechta feature aralashtirilmaydi
