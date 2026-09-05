# 04 — API konvensiyalari v2 (P1)

> `AGENTS.md` §4 dagi konvensiyalarni **kengaytiradi**. Qabul qilingach `AGENTS.md` va
> `.cursor/rules/*.mdc` yangilanadi (`12-CODEGEN-DX-DOCS.md`).

---

## 1. Route prefikslari: kim uchun API

Hozir hamma narsa `/v1/<resource>` va admin-guard ostida. Mijoz tomoni paydo bo'lganda
uchta auditoriya aniq ajratiladi (influencer loyihasidagi ADR-009 bilan bir xil yondashuv):

| Prefiks | Kim | Guard | Swagger definition |
|---|---|---|---|
| `/v1/admin/**` | Admin panel | `AuthGuard + PermissionsGuard` | `admin` |
| `/v1/app/**` | Web / mobil / Telegram mijoz | `OptionalAuthGuard` (mehmon ham ko'radi) yoki `AuthGuard` | `app` |
| `/v1/seller/**` | Do'kon egasi (keyin) | `AuthGuard + StoreOwnerGuard` | `seller` |
| `/v1/auth/**` | Hamma | route'ga qarab | hammasida |
| `/files/**`, `/health` | Hamma | yo'q | — |

Mavjud controller'lar `@Controller('admin/categories')` ga ko'chiriladi (frontend URL'larini
bir marta o'zgartirish — hozir, mijoz API'dan oldin, arzon).

Swagger: `SwaggerModule.createDocument(app, config, { include: [...adminModules] })` yoki
path-filter bilan uchta hujjat, `/api` da "Select a definition" dropdown.

---

## 2. Pageable v2: whitelist + boy operatorlar + sort maydoni

**Hozir.** `PaginationFilterOrderRequest`: `filter[].operation` faqat `'='`, `order` faqat `createdAt` bo'yicha,
maydon nomi tekshirilmaydi (`01-SECURITY` S7).

**Yangi kontrakt** (orqaga mos — eski `filter`/`order` hali ishlaydi):
```ts
export class QueryRequestDto {
  @Min(1) page = 1;
  @Min(1) @Max(100) perPage = 20;
  @ValidateNested({ each: true }) @Type(() => FilterItem) filter?: FilterItem[];
  @ValidateNested({ each: true }) @Type(() => SortItem)   sort?: SortItem[];   // [{field:'price', dir:'DESC'}]
  @IsOptional() @IsString() @MaxLength(100) search?: string;                  // nameUz/nameRu ilike
  @IsOptional() @IsIn(['ASC','DESC']) order?: 'ASC'|'DESC';                     // legacy
}
class FilterItem {
  @IsString() field: string;
  @IsIn(['eq','ne','gt','gte','lt','lte','in','nin','contains','between','isNull']) op: FilterOp;
  value: unknown;
}
```

**Whitelist** — har modul o'z `*.query.ts` faylida:
```ts
export const CATEGORY_QUERY: QuerySpec = {
  filterable: { nameUz: 'string', nameRu: 'string', active: 'boolean', parentId: 'string', position: 'number' },
  sortable:   ['position', 'createdAt', 'nameUz'],
  searchable: ['nameUz', 'nameRu', 'slugUz', 'slugRu'],
  defaultSort: { field: 'position', dir: 'ASC' },
};
```
`buildPrismaQuery(dto, CATEGORY_QUERY)` → `{ where, orderBy, skip, take }`; ro'yxatda yo'q maydon → `400 FILTER_FIELD_NOT_ALLOWED`.
Tip tekshiruvi: `'number'` maydoniga string kelsa 400. Bu `helpers/getWhereOperations.ts` o'rnini bosadi.

**Javob** o'zgarmaydi: `{ data, totalItems, totalPages, currentPage }`. Katta jadvallar uchun
`count` qimmat bo'lsa — `?withTotal=false` (`totalItems: null`) yoki cursor (`06-PERFORMANCE` §6).

---

## 3. Javob serializatsiyasi

- Har resurs `toResponse(entity)` mapper yoki `class-transformer` entity bilan qaytariladi;
  Prisma obyektini to'g'ridan-to'g'ri qaytarish — **taqiqlanadi** (parol, ichki maydonlar sizadi).
- Global: `ClassSerializerInterceptor` yoki mavjud `TransformInterceptor` + `plainToInstance(ResponseDto, data, { excludeExtraneousValues: true })` — `@Expose()` qo'yilmagan maydon chiqmaydi (oq ro'yxat).
- `Decimal` → string emas, `number` (`@Transform(({value}) => Number(value))`), yoki API'da string + hujjatlash. Qaror: **number** (frontend qulayligi; 14,2 aniqlik `number` ga sig'adi).
- Sanalar: ISO 8601 UTC (hozirgidek).

---

## 4. Xato formati va kodlari

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "phone must match /^998\\d{9}$/",
  "errors": ["phone must match …", "password must be longer than…"],
  "path": "/v1/auth/signup",
  "requestId": "01J…",
  "timestamp": "2026-09-05T10:00:00.000Z"
}
```
`src/common/error-codes.ts`:
```ts
export const ERR = {
  VALIDATION_ERROR: 'VALIDATION_ERROR', NOT_FOUND: 'NOT_FOUND', ALREADY_EXISTS: 'ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS', EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  SESSION_REVOKED: 'SESSION_REVOKED', TOKEN_REUSE: 'TOKEN_REUSE', FORBIDDEN: 'FORBIDDEN',
  FILTER_FIELD_NOT_ALLOWED: 'FILTER_FIELD_NOT_ALLOWED', ROLE_IN_USE: 'ROLE_IN_USE',
  OUT_OF_STOCK: 'OUT_OF_STOCK', PROMOCODE_INVALID: 'PROMOCODE_INVALID', RATE_LIMITED: 'RATE_LIMITED',
} as const;
```
`throw new NotFoundException({ code: ERR.NOT_FOUND, message: 'Category not found' })` — filter `code` ni oladi.
Frontend matnni emas, `code` ni tekshiradi; matn i18n bilan almashadi.

---

## 5. i18n

- **So'rov tili**: `Accept-Language: uz|ru` yoki `?lang=`. `LangMiddleware` → `req.lang` (default `uz`).
- **Public javoblar** (`/v1/app/**`): `nameUz/nameRu` ikkalasi qaytadi **va** `name` — tanlangan til
  (frontend ikki marta ishlamaydi). Admin javoblarida faqat `Uz/Ru`.
- **Xato xabarlari**: `nestjs-i18n` (`src/i18n/{uz,ru}/errors.json`), `code` → matn. Validatsiya
  xabarlarini ham tarjima qilish mumkin (`I18nValidationPipe`).
- Email/SMS shablonlari: `verify-email.uz.hbs`, `verify-email.ru.hbs`, `User.locale` bo'yicha.

---

## 6. HTTP metodlar va idempotentlik

| Amal | Hozir | Taklif |
|---|---|---|
| Update | `PUT /resource` (id body'da, to'liq obyekt) | Saqlanadi (`AGENTS.md`), **qo'shimcha** `PATCH /resource/:id` (`PartialType`) — admin jadvalidagi "active" toggle uchun |
| Create | `POST` → 201 | Saqlanadi |
| Delete | `DELETE /:id` → `true` | `204 No Content` (yangi modullar), eski — saqlanadi |
| Restore | `PATCH /:id/restore` | Saqlanadi, barcha soft-delete modullarda |
| Buyurtma yaratish | — | `Idempotency-Key` header (UUID), 24 soat Redis'da: takror so'rov → o'sha javob |
| Bulk | — | `POST /admin/products/bulk` `{ ids, action: 'activate'|'deactivate'|'delete' }` |

---

## 7. Auth kontrakti (kengaytma)

| Endpoint | Izoh |
|---|---|
| `POST /v1/auth/signup` | `roleId/subType/active` **yo'q** (S1) |
| `POST /v1/auth/signin` | 401 `INVALID_CREDENTIALS` bir xil; 403 `EMAIL_NOT_VERIFIED` |
| `GET /v1/auth/me` | `AuthGuard` bilan; `get-me` → `me` (eski alias vaqtincha) |
| `GET /v1/auth/sessions` | Foydalanuvchining faol sessiyalari (`userAgent`, `ipAddress`, `createdAt`) |
| `DELETE /v1/auth/sessions/:sid` | Bitta qurilmani chiqarish |
| `POST /v1/auth/change-password` | `AuthGuard`; eski parol + yangi; boshqa sessiyalarni revoke |
| `POST /v1/auth/otp/request`, `/otp/verify` | Mijoz: telefon + OTP (`05-CORE` §2) |
| `POST /v1/auth/telegram/init` | Telegram Mini App (`13-IDEAS` §23) |

Access token payload: `{ sub, sid, roleId, type }` — `roleId` tokenda bo'lsa `PermissionsGuard`
`user` obyektiga muhtoj emas; `type` (`ADMIN|CUSTOMER|SELLER`) — prefiks bo'yicha kirishni cheklash.

---

## 8. Swagger sifat qoidalari

- `@ApiBody` faqat `POST/PUT/PATCH` da; `GET` da `@ApiParam` + `@ApiResponse`.
- Har endpointda kamida `200/201`, `400`, `401`, `403`, `404` javoblari (`@ApiResponse`), umumiy dekorator:
  `@ApiCrudResponses(CategoryResponse)` (custom `applyDecorators`).
- DTO `example` — real Uz/Ru qiymatlar.
- `@ApiTags` — resurs nomi ko'plikda inglizcha (`Categories`).
- `mapped-types` emas, `@nestjs/swagger` dan `PartialType/OmitType/PickType`.
- **OpenAPI export**: `pnpm api:export` → `openapi/admin.json`, `openapi/app.json` (CI artefakt) →
  frontend `openapi-typescript` bilan tip generatsiya qiladi. Skript: `src/swagger/export.ts` (app'ni `NestFactory.create` qilib `createDocument` → `writeFileSync`).

---

## 9. Versiyalash

URI versioning bor (`/v1`). Buzuvchi o'zgarish (`Float→number` emas, `getById` 404 — buzuvchi emas)
kelganda `@Version('2')` faqat o'sha controller'ga. `Deprecation` header bilan eski route'ni 1 versiya saqlash.

---

## Qarorlar

- `Decimal` API'da `number` sifatida (2026-09-05, taklif — tasdiqlanishi kerak).
- Prefikslar: `admin/app/seller` (taklif).
