# Marketplace Backend uchun bilimlar va roadmap (UZ)

Bu hujjat oldingi javobning o'zbekcha tarjimasi va amaliy roadmap hisoblanadi.
Maqsad: backend bo'yicha zarur bilimlarni **osondan murakkabgacha** o'rganib, shu loyihaga ketma-ket tatbiq qilish.

---

## 1) Loyihada ko'ringan asosiy bo'shliqlar (real gaplar)

Quyidagilar bevosita koddan ko'rinadi va birinchi navbatda yopilishi kerak:

- `src/api/auth/auth.service.ts` da `throw new Error('User not found')` ishlatilgan (Nest exception emas).
- Global `ExceptionFilter` yo'q (xatolar yagona formatda chiqmaydi).
- `ConfigModule.forRoot()` da env validatsiya sxemasi yo'q.
- `PermissionsGuard` har requestda role'ni DBdan oladi (cache yo'q).
- `signin` uchun rate-limit yo'q (bruteforce xavfi).
- Refresh token, logout, token blacklist oqimi yo'q.
- Ko'p joylarda `getAll()` pagination'siz ishlaydi.
- Testlar juda kam (unit/e2e qamrovi past).
- Docker/CI/healthcheck/deploy jarayonlari tayyor emas.
- `strictNullChecks: false`, `noImplicitAny: false` texnik qarzni oshiradi.

---

## 2) Osondan murakkabgacha o'rganish yo'li

### Level 1 — Junior'dan mustahkam Junior/Middle boshlanishi (1-3 hafta)

1. **Env validatsiya** (`Joi` yoki `Zod` bilan `ConfigModule`):
   - Nima uchun: noto'g'ri `.env` bilan app ishga tushmasligi kerak.
   - Qayerga tatbiq: `src/app.module.ts`.

2. **Global ExceptionFilter**:
   - Nima uchun: xatolar yagona formatda qaytadi.
   - Qayerga tatbiq: `src/main.ts`, `src/common/all-exceptions.filter.ts`.

3. **Nest exceptionlar ierarxiyasi** (`BadRequestException`, `NotFoundException`, ...):
   - Nima uchun: to'g'ri HTTP status.
   - Qayerga tatbiq: `auth.service.ts` va boshqa servislar.

4. **Rate limiting** (`@nestjs/throttler`):
   - Nima uchun: `/auth/signin` himoyasi.
   - Qayerga tatbiq: `AuthController`.

5. **Security bazasi** (`helmet`, CORS whitelist):
   - Qayerga tatbiq: `main.ts`.

6. **Request logging** (Pino yoki standart Logger):
   - Qayerga tatbiq: global middleware/interceptor.

7. **Healthcheck** (`@nestjs/terminus`):
   - Qayerga tatbiq: `/health` endpoint.

8. **Refresh token + logout**:
   - Qayerga tatbiq: `AuthService` + Prisma model.

9. **Email verification + reset password**:
   - Qayerga tatbiq: Auth oqimi.

10. **API versioning**:
   - Qayerga tatbiq: `main.ts`.

11. **Hamma list endpointlarga pagination**:
   - Qayerga tatbiq: `getAll()` metodlari.

12. **`class-validator`ni chuqurlashtirish**:
   - `@Min`, `@Max`, `@Matches`, `@ValidateNested`, `@Transform`.

---

### Level 2 — Mustahkam Middle (1-2 oy)

13. **Prisma transactionlar** (`$transaction`):
   - Murakkab create/update oqimlarida atomicity.

14. **DB indexing + `EXPLAIN ANALYZE`**:
   - Qidiruv va list endpointlarni tezlatish.

15. **Redis caching**:
   - `PermissionsGuard`, `Category`, `Banner` listlarida cache.

16. **Cache invalidation strategiyasi**:
   - update/delete bo'lganda cache tozalash.

17. **Event-driven yondashuv** (`@nestjs/event-emitter`):
   - `signUp`dan keyin email yuborish kabi oqimlar.

18. **Queue (BullMQ)**:
   - Email, SMS, fayl processing kabi fon vazifalar.

19. **Email servis (template bilan)**:
   - registration/forgot password oqimlari.

20. **OTP/SMS auth**:
   - telefon asosida kirish.

21. **Rasm processing (`sharp`)**:
   - thumbnail, webp, resize.

22. **To'liq testlar**:
   - Unit + e2e + test DB.

23. **i18n integratsiyasi**:
   - Uz/Ru kontentni `Accept-Language` orqali boshqarish.

24. **Soft delete (`deletedAt`)**:
   - to'liq o'chirish o'rniga tiklanadigan o'chirish.

25. **Audit log**:
   - kim, qachon, nima o'zgartirdi.

26. **Permissions uchun cache**:
   - har requestda DBga borishni kamaytirish.

27. **Cursor-based pagination**:
   - katta data uchun barqaror pagination.

28. **Bulk operations** (`createMany/updateMany`):
   - massiv import/yangilashlar.

---

### Level 3 — Senior darajasiga yo'l (2-4 oy)

29. **WebSocket scale (Redis adapter)**.
30. **WebSocket auth (handshake JWT)**.
31. **DDD asoslari (entity/value object/use-case)**.
32. **Clean/Hexagonal architecture**.
33. **CQRS (`@nestjs/cqrs`)**.
34. **Full-text search** (Postgres `tsvector` yoki Meilisearch).
35. **Payment integration** (Stripe/Click/Payme) + webhooklar.
36. **Idempotency (`Idempotency-Key`)**.
37. **Multi-tenancy** (agar store'lar tenant bo'lsa).
38. **Katta fayllar bilan stream arxitekturasi**.
39. **Swagger'dan frontend SDK generator**.
40. **Read-replica va DB scale strategiyasi**.
41. **Outbox pattern**.
42. **Saga pattern**.

---

### Level 4 — DevOps/SRE (parallel o'rganish)

43. **Docker + docker-compose** (app + postgres + redis).
44. **CI/CD** (lint/test/build/migrate/deploy pipeline).
45. **Kubernetes asoslari**.
46. **Safe migration strategiyasi** (expand/migrate/contract).
47. **Backup + recovery**.
48. **Monitoring** (Prometheus/Grafana).
49. **Tracing** (OpenTelemetry).
50. **Centralized logging** (Loki/ELK).
51. **APM** (Sentry/Datadog/NewRelic).
52. **Reverse proxy + TLS**.
53. **Secrets management** (Vault/SSM/Doppler).
54. **Load testing** (k6/Artillery).

---

### Level 5 — Architect/Staff yo'nalishi (6+ oy)

55. Mikroservislar (`@nestjs/microservices`).
56. Brokerlar (RabbitMQ/Kafka).
57. Event sourcing/projections.
58. gRPC.
59. GraphQL (DataLoader, federation).
60. Service mesh.
61. Sharding/partitioning.
62. Feature flags.
63. Chaos engineering.
64. Security audit (OWASP, SAST/DAST).
65. Compliance (GDPR/PCI DSS).

---

## 3) Amaliy roadmap (ketma-ket bajarish tartibi)

Quyidagi tartib bilan borsang, nazariya + amaliyot birga yopiladi:

### Sprint 1 (1-hafta)
- Env validatsiya
- Global ExceptionFilter
- `throw new Error` joylarini Nest exceptionlarga almashtirish
- `helmet` + CORS whitelist

### Sprint 2 (2-hafta)
- Throttler (`/auth/signin`)
- Request logging
- Healthcheck endpoint
- `getAll()` endpointlarga pagination

### Sprint 3 (3-hafta)
- Refresh token modeli va oqimi
- Logout endpoint
- Token rotation

### Sprint 4 (4-hafta)
- Redis cache (`PermissionsGuard`, category/banner list)
- Cache invalidation

### Sprint 5-6
- Unit/e2e test bazasi
- Prisma transactionlar
- Email verification + forgot password

### Sprint 7-8
- BullMQ queue
- OTP/SMS
- Audit log

Shundan keyin Level 3 mavzulariga o'tish tavsiya etiladi.

---

## 4) Birinchi 10 ta tavsiya etilgan PR

1. `chore: env validation schema add`
2. `feat: global exception filter`
3. `fix: replace raw Error with Nest exceptions`
4. `feat: helmet and strict cors config`
5. `feat: throttler for auth endpoints`
6. `feat: refresh token and logout flow`
7. `feat: healthcheck endpoint`
8. `feat: redis cache for permissions guard`
9. `feat: pagination for list endpoints`
10. `chore: dockerfile and docker-compose setup`

---

## 5) O'rganish usuli (eng samarali)

- Bir vaqtda bitta mavzu.
- O'rgan -> shu repo'da kodga qo'lla -> PR och.
- Har mavzu uchun `docs/learning-log.md`ga:
  - nima o'rganding,
  - qayerda qo'llading,
  - qanday xatoga duch kelding,
  - qanday yechding.
- Har PR'da minimal test yoz.

---

## 6) Keyingi qadam (hozir nima qilamiz?)

Tavsiya: **Sprint 1 / Task 1** dan boshlash:
1) `ConfigModule` uchun env validatsiya sxemasini qo'shamiz,  
2) keyin global `ExceptionFilter` qo'shamiz.

Shu ikkitasi backend sifatini darhol sezilarli oshiradi.
