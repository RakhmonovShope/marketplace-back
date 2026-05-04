# Marketplace Backend — Agent Guide

Этот файл — единственный источник правды для AI-ассистентов (Claude Code, Cursor, и т.п.), работающих в этом репозитории. Cursor дополнительно использует фокусные правила из `.cursor/rules/`.

---

## 1. Стек и архитектура

- **Framework:** NestJS 10 (Express, REST + WebSockets)
- **Language:** TypeScript 5 (CommonJS, `target: ES2021`)
- **DB / ORM:** PostgreSQL + Prisma 5 (`prisma/schema.prisma`)
- **Auth:** Passport JWT + permission-based RBAC (см. `src/api/auth/`)
- **Cache:** Redis (`cache-manager`, `ioredis`)
- **Storage:** AWS S3 (для аудио) + локальный диск `uploads/files/<year>/<month>/<day>/` (для изображений)
- **Realtime:** `socket.io` через `@nestjs/websockets`
- **Scheduler:** `@nestjs/schedule` (cron-задачи в `src/api/cron/`)
- **Docs:** Swagger UI на `/api`
- **Package manager:** **pnpm** (НЕ npm и НЕ yarn)
- **Codegen:** Plop (`tools/generators/`) — автогенерация CRUD-модуля из новой Prisma-модели

---

## 2. Структура репозитория

```
src/
  api/
    <feature>/                     # Один feature = один Nest-модуль
      <feature>.controller.ts      # REST endpoints + Swagger декораторы
      <feature>.service.ts         # Бизнес-логика + Prisma-вызовы
      <feature>.module.ts          # Nest @Module
      <feature>.dto.ts             # Create / Update / *Response / PageableResponseDto
      index.ts                     # Реэкспорт Service/Controller/Module
      [<feature>.enum.ts]          # Опционально (см. auth/auth.enum.ts)
      [<feature>.guard.ts]         # Опционально (см. auth/*.guard.ts)
  common/common.dto.ts             # PageableDto, PaginationFilterOrderRequest
  helpers/                         # Чистые утилиты (getWhereOperations и т.п.)
  prisma/                          # PrismaService (Global module)
  app.module.ts                    # Сборка всех feature-модулей
  app.controller.ts | app.service.ts
  main.ts                          # Bootstrap (CORS, ValidationPipe, Swagger)
  transform.interceptor.ts         # Глобальный class-transformer interceptor

prisma/
  schema.prisma                    # Единый источник схемы БД
  migrations/                      # Применённые миграции
  models.json                      # Список моделей, уже сгенерированных через Plop
  seed.ts                          # Сид супер-админа

tools/generators/                  # Plop-шаблоны для CRUD
test/                              # e2e (Jest)
```

`tsconfig.json` имеет `baseUrl: "src"`, поэтому импорты `common/common.dto` и `helpers` работают без `../../`.

---

## 3. Команды

```bash
pnpm install                       # Установка зависимостей
pnpm prisma:generate               # Регенерация Prisma Client (запускается build-ом)
pnpm start:dev                     # Dev-режим с watch
pnpm start                         # Обычный запуск
pnpm start:prod                    # Прод (из dist/)
pnpm build                         # prisma generate + nest build
pnpm lint                          # ESLint --fix по src/, apps/, libs/, test/
pnpm format                        # Prettier write
pnpm test                          # Jest unit (ищет *.spec.ts в src/)
pnpm test:e2e                      # Jest e2e (test/jest-e2e.json)
pnpm seed                          # Запуск prisma/seed.ts
pnpm migrate:seed                  # prisma migrate deploy + db seed
pnpm generate                      # Plop CRUD из новой модели prisma/schema.prisma
```

Миграции БД (для разработки):
```bash
pnpm prisma migrate dev --name <change_name>
```

---

## 4. Конвенции, которые НУЖНО соблюдать

### 4.1 Структура feature-модуля

Каждый CRUD-модуль ОБЯЗАН следовать паттерну, см. `src/api/category/` как эталонный пример. Файлы внутри строго: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.dto.ts`, `index.ts`. См. `.cursor/rules/module-structure.mdc`.

### 4.2 Многоязычность

Поля, видимые пользователю, дублируются с суффиксами `Uz` и `Ru`:
- `nameUz`, `nameRu`
- `descriptionUz`, `descriptionRu`
- `slugUz`, `slugRu`, `coverUz`, `coverRu`, `contentUz`, `contentRu` и т.п.

При добавлении нового локализованного поля — всегда два варианта.

### 4.3 DTO

- Импортируются как namespace: `import * as CategoryDTO from './category.dto'`.
- Внутри DTO-файла обязательны экспорты: `Create`, `Update extends Create` (с полем `id`), `<Feature>Response`, `PageableResponseDto extends PageableDto`.
- Все поля DTO декорируются `@ApiProperty(...)` и валидаторами `class-validator` (`@IsString`, `@IsNotEmpty`, `@IsBoolean`, `@IsNumber`, `@IsOptional`).
- См. `.cursor/rules/dtos.mdc`.

### 4.4 Контроллеры

- Стандартные роуты CRUD-модуля:
  - `POST /<resource>/pageable` — `getAllByPage(PaginationFilterOrderRequest)`
  - `GET /<resource>` — `getAll()`
  - `GET /<resource>/:id` — `getById(id)`
  - `POST /<resource>` — `create(payload)`
  - `PUT /<resource>` — `update(payload)` (id берётся **из тела**, не из URL)
  - `DELETE /<resource>/:id` — `delete(id)`
- На классе всегда: `@ApiBearerAuth()`, `@ApiTags('<Feature>')`, `@Controller('<resource>')`, `@UseGuards(AuthGuard(), PermissionsGuard)`.
- Каждый метод декорируется `@ApiOperation`, `@ApiBody`/`@ApiResponse` и `@Permissions(PERMISSIONS.<FEATURE>__<ACTION>)`.
- Исключение — `AuthController` и публичный `GET` загруженного файла: они без guard'ов.
- См. `.cursor/rules/controllers.mdc`.

### 4.5 Сервисы

- Используют `PrismaService` (глобальный) и `ConfigService`.
- Имеют `private logger = new Logger('<FeatureName> service')`.
- Pageable читает `perPage` из `ConfigService.get('PAGE_SIZE')` по умолчанию.
- Фильтрация — через `getWhereOperations(filter)` из `helpers`.
- `update` обычно принимает `{ payload }: { payload: <Feature>DTO.Update }` и берёт `id` из `payload.id`.
- `delete` принимает `{ id }: { id: string }` и возвращает `boolean` (или `'deleted'` для admin).
- См. `.cursor/rules/services.mdc`.

### 4.6 Permissions / RBAC

- Все permission-константы — в `src/api/auth/auth.enum.ts` в формате `<FEATURE>__<ACTION>` (`CATEGORY__VIEW`, `STORE__DELETE`).
- Применяются через `@Permissions(PERMISSIONS.<NAME>)` и работают только при `@UseGuards(AuthGuard(), PermissionsGuard)`.
- Permissions хранятся в `Role.permissions: String[]` и проверяются `PermissionsGuard` против `user.roleId`.
- При добавлении нового модуля — добавить 4 permission'а (`__CREATE`, `__VIEW`, `__UPDATE`, `__DELETE`) и упомянуть их в `prisma/seed.ts` для super-admin (если нужно).
- См. `.cursor/rules/permissions.mdc`.

### 4.7 Prisma

- Источник истины — `prisma/schema.prisma`. Никогда не редактировать сгенерированный клиент.
- ID — всегда `String @id @default(uuid())`.
- Audit-поля — всегда `createdAt DateTime @default(now())` и `updatedAt DateTime @updatedAt`.
- Soft-disable через `active Boolean @default(false)`.
- Enum'ы — `UPPER_SNAKE_CASE` (`GENDER`, `SUB_TYPE`, `BADGE_TYPE`, `COMMENT_TYPE`).
- Имена моделей — `PascalCase` в единственном числе (`User`, `Category`, `Product`).
- См. `.cursor/rules/prisma.mdc`.

### 4.8 Стиль кода

- Prettier: `singleQuote: true`, `trailingComma: 'all'`.
- ESLint: `@typescript-eslint/recommended` + `prettier`. `no-explicit-any` отключён, но `any` всё равно избегаем без необходимости.
- `tsconfig`: `strictNullChecks: false`, `noImplicitAny: false` — НЕ полагаемся на nominal типизацию.
- Никогда не пишем код в `dist/`, `node_modules/`, `prisma/migrations/`.
- См. `.cursor/rules/code-style.mdc`.

---

## 5. Добавление новой сущности (рекомендуемый workflow)

1. Описать модель в `prisma/schema.prisma` с правильными `Uz`/`Ru` полями, `id`, `active`, `createdAt`, `updatedAt`.
2. Запустить `pnpm generate` — Plop сам создаст `src/api/<name>/*` и допишет в `app.module.ts` + `auth.enum.ts`.
3. Накатить миграцию: `pnpm prisma migrate dev --name add_<entity>`.
4. Если super-admin должен иметь доступ — добавить новые permission'ы в `prisma/seed.ts`.
5. Если автоген не подходит — копировать `src/api/category/` как эталон и адаптировать.

---

## 6. Что НЕ делать

- Не менять `pnpm-lock.yaml` руками.
- Не использовать `npm`/`yarn` — только `pnpm`.
- Не писать SQL руками — только через Prisma (исключения — миграции).
- Не удалять `permissions.guard.ts`, `auth.enum.ts`, `transform.interceptor.ts` — это инфраструктура.
- Не добавлять локализованные поля только для одного языка.
- Не использовать `Pageable` без `getWhereOperations(filter)` — это часть контракта API.
- Не коммитить `.env`, `dist/`, `uploads/`.

---

## 7. Полезные ссылки внутри кода

- Эталонный CRUD: `src/api/category/`
- Permissions: `src/api/auth/auth.enum.ts`, `src/api/auth/permissions.guard.ts`, `src/api/auth/permissions.decorator.ts`
- Pageable utilities: `src/common/common.dto.ts`, `src/helpers/getWhereOperations.ts`
- WebSocket пример: `src/api/message/chat.gateway.ts`
- S3 upload: `src/api/audio/audio.controller.ts`
- Локальный upload: `src/api/file/file.controller.ts`
- Cron пример: `src/api/cron/example/cron.service.ts`
- Plop шаблоны: `tools/generators/templates/crud/`
