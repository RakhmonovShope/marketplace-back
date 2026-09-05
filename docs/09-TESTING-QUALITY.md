# 09 — Test va kod sifati (P1)

> Hozir: 0 unit test, 1 boilerplate e2e (`test/app.e2e-spec.ts` — butun `AppModule` + real Postgres/Redis talab qiladi).
> `pnpm test` unit uchun `src/**/*.spec.ts` qidiradi — topmaydi. Jest `moduleNameMapper` yo'q →
> `import ... from 'common/common.dto'` (baseUrl) unit testda **resolve bo'lmaydi**.

---

## 1. Jest konfiguratsiyasi (avval shu)

`package.json` → `jest.config.ts` ga ko'chirish:
```ts
export default {
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { isolatedModules: true }] },   // 3–5× tezroq
  moduleDirectories: ['node_modules', 'src'],                            // baseUrl: src uchun
  setupFiles: ['<rootDir>/test/setup-env.ts'],                           // process.env defaults
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts', '!src/**/*.dto.ts'],
  coverageThreshold: { global: { lines: 60, branches: 50 } },           // asta oshiriladi
};
```
`test/jest-e2e.json` ham `moduleDirectories` oladi. Skriptlar: `test`, `test:cov`, `test:e2e`, `typecheck: tsc --noEmit`.

---

## 2. Unit testlar — birinchi 10 ta (qiymati eng yuqori)

| # | Nima | Fayl | Nimani tekshiradi |
|---|---|---|---|
| 1 | `AuthService.refresh` | `auth.service.spec.ts` | rotation: eski token revoked; reuse → barcha sessiyalar revoked + 401; expired → 401 |
| 2 | `AuthService.signIn` | | user yo'q / parol xato → **bir xil** 401; emailVerified=false → 403 |
| 3 | `AuthService.resetPassword` | | token bir martalik; sessiyalar revoke |
| 4 | `calculateExpiry` | | `7d/15m/3600s`, noto'g'ri format → default |
| 5 | `PermissionsGuard` | `permissions.guard.spec.ts` | Redis hit / miss → DB / Redis xato → DB; permission yo'q → 403; `@Permissions` yo'q → true |
| 6 | `buildPrismaQuery` (Pageable v2) | `query.spec.ts` | whitelist'da yo'q maydon → 400; `between`, `in`; sort default |
| 7 | `AllExceptionsFilter` | | Prisma P2002 → 409, P2025 → 404, validatsiya array → `errors[]` |
| 8 | `ImageProcessor.process` | `image.processor.spec.ts` | `DONE` bo'lsa skip (idempotent); yozuv yo'q → skip; muvaffaqiyat → `completeImageUpload` + `deleteOriginal` |
| 9 | `ImageQueueService.recover` | | PENDING va eski PROCESSING → enqueue; `recovering` qulfi |
| 10 | `MailService.render` | | template + layout; `console` rejimida `sendMail` chaqirilmaydi |

Mock'lar: `PrismaService` — `jest-mock-extended` (`mockDeep<PrismaClient>()`); Redis — `ioredis-mock`; `ConfigService` — `{ get: jest.fn() }`.
Vaqt — `jest.useFakeTimers({ now })`.

---

## 3. e2e — real DB bilan, lekin izolyatsiyada

- **Testcontainers** (`@testcontainers/postgresql`, `redis`) — `globalSetup` da konteynerlar ko'tariladi, `DATABASE_URL` yoziladi,
  `prisma migrate deploy` bajariladi; CI'da Docker bor (GitHub Actions). Alternativa: `docker-compose -f docker-compose.test.yml`.
- Har test fayli oldidan `TRUNCATE ... CASCADE` (tez) yoki har test transaction'da (`prisma-transactional` murakkab — truncate yetarli).
- Fabrikalar: `test/factories/{user,role,category,product}.factory.ts` (`@faker-js/faker`), `createAdminWithToken()` helper.
- Oqimlar (birinchi navbatda):
  1. `auth`: signup → (console mail'dan token) verify → signin → me → refresh → logout → refresh 401.
  2. `signup` `roleId` yuborsa 400 (S1 regressiyasi).
  3. `admin` javobida `password` yo'q (S2).
  4. `category` CRUD + soft delete + restore + pageable filter/sort/search.
  5. `files/image`: upload → 202 → worker (test'da `ImageProcessor.process` ni to'g'ridan-to'g'ri chaqirish) → `DONE` → `GET /files/...` 200 + `Cache-Control`.
  6. `files/upload` SVG → rad etilishi yoki `attachment`.
  7. Throttler: `signin` 6-marta → 429.
  8. WS: tokensiz ulanish → disconnect.
- `MAIL_TRANSPORT=console`, `STORAGE_DRIVER=local` (tmp papka), `IMAGE_CONCURRENCY=1`.

---

## 4. Kontrakt testlari

`openapi/*.json` (`04-API` §8) diffi CI'da: `pnpm api:export && git diff --exit-code openapi/` — API o'zgarsa PR'da ko'rinadi.
Frontend tiplari shu JSON'dan — buzilish darhol bilinadi.

---

## 5. Yuk testi

`k6` skripti `test/load/catalog.js`: 100 VU, 2 min, `search` + `product/:slug` + `cart` oqimi. Chegaralar: p95 < 300 ms, xato < 0.5%.
Staging'da har relizdan oldin (`10-DEVOPS` §9).

---

## 6. TypeScript qat'iyligi — bosqichma-bosqich

Hozir `strictNullChecks: false`, `noImplicitAny: false`. Birdan `strict: true` — yuzlab xato.
1. `noImplicitAny: true` (kam xato; `getWhereOperations: any` kabi joylar tuziladi).
2. `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
3. `strictNullChecks: true` — modul-modul: `tsconfig.strict.json` + `include: ['src/common', 'src/api/auth']` → `pnpm typecheck:strict` CI'da; ro'yxat kengayadi.
4. `useUnknownInCatchVariables` (allaqachon `(err as Error)` yoziladi — oson).
`AGENTS.md` §4.8 dagi "nominal tipizatsiyaga tayanmaymiz" yozuvi yangilanadi.

---

## 7. Lint va commit intizomi

- ESLint 8 → 9 flat config (`11-UPGRADES`), qoidalar: `@typescript-eslint/no-floating-promises` (`MessageController.create` da `await` yo'q),
  `no-console` (`warn`; `Logger` ishlatiladi), `import/order`.
- `husky` + `lint-staged`: pre-commit `eslint --fix` + `prettier` faqat o'zgargan fayllarga; pre-push `pnpm typecheck && pnpm test`.
- `commitlint` (`@commitlint/config-conventional`) — git log allaqachon conventional, endi majburiy.
- `pnpm audit --audit-level=high` CI'da (`multer` 1.x advisory'lari — `11-UPGRADES`).

---

## 8. Code review checklist (PR shabloni `.github/pull_request_template.md`)

- [ ] Yangi endpointda `@Permissions`, `@ApiResponse` (4xx bilan), DTO validatsiya
- [ ] Prisma obyekti to'g'ridan-to'g'ri qaytarilmagan (mapper/serializer)
- [ ] `deletedAt` hisobga olingan (yoki extension)
- [ ] Yangi env → Joi schema + `.env.example`
- [ ] Migratsiya orqaga mos (expand/contract)
- [ ] Unit/e2e test qo'shilgan; `pnpm lint && pnpm typecheck && pnpm test` yashil
