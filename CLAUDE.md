# CLAUDE.md

Этот файл — точка входа для Claude Code в репозитории.

Полный гид по проекту, командам и конвенциям находится в [`AGENTS.md`](./AGENTS.md). Прочитай его перед началом работы.

Дополнительные фокусные правила (используются и Cursor, и любым агентом, который умеет их читать) лежат в [`.cursor/rules/`](./.cursor/rules/):

- `project-overview.mdc` — стек и общая структура.
- `module-structure.mdc` — структура feature-модуля.
- `controllers.mdc` — паттерны NestJS-контроллеров и Swagger-декораторов.
- `services.mdc` — паттерны сервисов с Prisma.
- `dtos.mdc` — конвенции DTO + class-validator + Swagger.
- `prisma.mdc` — конвенции схемы Prisma и миграций.
- `permissions.mdc` — система RBAC и `@Permissions(...)`.
- `code-style.mdc` — Prettier, ESLint, импорты, общий стиль.

## TL;DR для срочных правок

- Менеджер пакетов: **pnpm**.
- Эталонный CRUD-модуль: `src/api/category/`.
- Каждый модуль = 5 файлов: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.dto.ts`, `index.ts`.
- Все локализованные поля дублируются с суффиксами `Uz` / `Ru`.
- Защищённые роуты обязаны иметь `@UseGuards(AuthGuard(), PermissionsGuard)` + `@Permissions(PERMISSIONS.<NAME>)`.
- Pageable-эндпоинт принимает `PaginationFilterOrderRequest` и возвращает `PageableResponseDto`.
- Перед PR: `pnpm lint && pnpm format && pnpm build`.
