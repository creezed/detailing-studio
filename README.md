# Detailing Studio

## Что это

B2B SaaS для детейлинг-студии: учёт материалов, онлайн-запись клиентов и рабочие процессы мастеров.

## Структура монорепо (apps/{backend,frontend,mobile,desktop} + libs/{shared,backend,frontend,mobile,desktop})

- **Apps:** `apps/{backend,frontend,mobile,desktop}`.
- **Libs:** `libs/{shared,backend,frontend,mobile,desktop}`.
- **Backend:** NestJS-приложения и Node-библиотеки.
- **Frontend:** Angular SPA/PWA и Angular-библиотеки.
- **Mobile/Desktop:** placeholder-платформы под будущие приложения.

## Стек

- **Monorepo:** Nx + pnpm workspaces.
- **Frontend:** Angular 19, Taiga UI, Tailwind.
- **Backend:** NestJS 10, MikroORM, PostgreSQL 16, Redis 7, MinIO, BullMQ.
- **Testing:** Jest, Playwright.

## Запуск (TBD)

Команды запуска будут добавлены после генерации первых приложений.

## Документация

- **Product:** [`docs/product.md`](./docs/product.md).
- **Engineering:** [`docs/engineering.md`](./docs/engineering.md).

## AI-агенты

- **Правила:** [`AGENTS.md`](./AGENTS.md).
