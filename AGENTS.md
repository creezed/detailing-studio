<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->

<!-- project configuration start-->
# AGENTS.md — правила работы AI-агента в этом проекте

> **Этот файл — главный источник правды для любого AI-агента (Cursor, Claude Code, Devin, Aider, Continue, Cline, Codex).** Если правило здесь и в каком-то другом месте противоречат друг другу — побеждает этот файл.
>
> Прежде чем писать **что-либо**, агент обязан:
> 1. Прочитать этот файл.
> 2. Прочитать [`docs/product.md`](./docs/product.md) и [`docs/engineering.md`](./docs/engineering.md) (или соответствующие разделы под задачу).
> 3. Если задача затрагивает доменный слой — прочитать раздел «Глоссарий (Ubiquitous Language)» в `product.md`.
> 4. Если задача затрагивает архитектуру — прочитать соответствующий раздел в `engineering.md`.
>
> Любые отклонения от правил ниже без явного запроса пользователя в тикете — **повод не мерджить PR**.

---

## 0. Контекст проекта (TL;DR)

**Продукт.** B2B SaaS веб-приложение для детейлинг-студии: учёт материалов и онлайн-запись клиентов. Три SPA-приложения: `admin`, `master`, `client`. Один backend.

**Стек.**
- Monorepo: **Nx** + pnpm workspaces.
- Frontend: **Angular 19** (standalone, signals), **Taiga UI**, **Tailwind**.
- Backend: **NestJS 10** (Fastify adapter), **MikroORM**, **PostgreSQL 16**, **Redis 7**, **MinIO** (S3), **BullMQ**.
- Архитектура: **строгий DDD**, **гексагональная архитектура** в каждом контексте, **CQRS-light** (CommandBus/QueryBus + Outbox), **in-process domain events** + outbox-паттерн.

**8 ограниченных контекстов:** `iam`, `catalog`, `inventory`, `crm`, `scheduling`, `work-order`, `notifications`, `billing`.

**4 слоя в каждом контексте:** `domain/`, `application/`, `infrastructure/`, `interfaces/`.

**Языки:** UI — RU. Идентификаторы кода — английский (классы, методы, файлы). Доменные термины пишутся **точно как в глоссарии**, никаких синонимов и вольных переводов.

---

## 1. Главные правила (нарушать запрещено)

### 1.1 Domain-слой остаётся стерильным

В `libs/*/domain/**` запрещено импортировать:

- Любые модули NestJS (`@nestjs/*`).
- Любые модули MikroORM (`@mikro-orm/*`).
- HTTP-клиенты (`axios`, `fetch`, `node-fetch`).
- Логгеры (`pino`, `winston`).
- Конфиги (`dotenv`, `@nestjs/config`).
- Telegraf, BullMQ, любые адаптеры.

Domain должен импортировать только:

- Стандартную библиотеку TypeScript.
- `@det/backend/shared/ddd` (базовые BE-примитивы: AggregateRoot, Entity, DomainEvent).
- `@det/shared/types` (brand-типы ID).
- `@det/shared/util` (чистые функции без декораторов: Money, date, validators).
- Другие файлы из того же `domain/`.

**Если ты не можешь реализовать что-то без внешней библиотеки — это сигнал, что логика не относится к domain.** Подними её в `application/` (через порт) или `infrastructure/`.

### 1.2 Cross-context импорты — только через ACL-порт

Один контекст **не имеет права** импортировать `domain/` другого контекста.

```
✗ libs/backend/work-order/domain/src/lib/work-order.aggregate.ts:
  import { Sku } from '@det/backend/inventory/domain'; // НЕЛЬЗЯ — чужой domain

✓ libs/backend/work-order/application/src/lib/ports/inventory-stock.port.ts:
  export interface IInventoryStockPort {
    consume(skuId: string, amount: number, branchId: string): Promise<void>;
  }
  // имплементация: libs/backend/work-order/infrastructure/src/lib/adapters/inventory-stock-port.adapter.ts
```

Контексты общаются через:

1. **Application-layer ports** — синхронный вызов use case соседнего контекста.
2. **Domain events** через outbox — асинхронная реакция.

### 1.3 Persistence ≠ Domain

В `infrastructure/persistence/` живёт **Schema** (MikroORM `EntitySchema` или `@Entity` декорированный класс) — это **отдельный** класс от domain-агрегата. Между ними обязателен **Mapper**.

**Запрещено:**

```
✗ Использовать @Entity-декорированный класс как domain-агрегат.
✗ Возвращать Schema-объекты из application/.
✗ Принимать Schema-объекты как параметры в командах/запросах.
```

**Правильный паттерн:**

```ts
// libs/backend/work-order/domain/src/lib/work-order.aggregate.ts
export class WorkOrder extends AggregateRoot {
  private constructor(/* ... */) { super(); }
  static restore(snapshot: WorkOrderSnapshot): WorkOrder { /* ... */ }
  toSnapshot(): WorkOrderSnapshot { /* ... */ }
  // бизнес-методы
}

// libs/backend/work-order/infrastructure/src/lib/persistence/work-order.schema.ts
@Entity({ tableName: 'wo_work_order' })
export class WorkOrderSchema { /* поля БД */ }

// libs/backend/work-order/infrastructure/src/lib/persistence/work-order.mapper.ts
export class WorkOrderMapper {
  static toDomain(schema: WorkOrderSchema): WorkOrder { /* ... */ }
  static toPersistence(domain: WorkOrder, existing: WorkOrderSchema | null): WorkOrderSchema { /* ... */ }
}
```

### 1.4 Один агрегат = одна транзакция

Команда меняет **ровно один** агрегат. Если бизнес-логика требует изменить два агрегата — это два разных use case, разделённых событием через outbox.

**Запрещено:**

```
✗ В одном CommandHandler вызвать save() для двух разных репозиториев.
✗ В одном агрегате держать ссылку на другой агрегат как объект.
```

**Правильно:**

- Хранить ссылку только по `Id` (`AggregateRoot` хранит `OtherAggregateId`, не `OtherAggregate`).
- Кросс-агрегатная согласованность достигается через `outbox` + EventHandler/Saga.

### 1.5 Анемичных агрегатов не существует

Бизнес-логика **обязана** жить в методах агрегата. Application-сервис только **оркестрирует**: загрузить → вызвать метод агрегата → сохранить.

**Запрещено:**

```
✗ Делать у агрегата только публичные геттеры/сеттеры и протаскивать всю логику в сервис.
✗ Менять состояние агрегата через if-ы в command handler.
```

**Правильно:**

```ts
// domain/scheduling/appointment.aggregate.ts
class Appointment {
  cancel(by: UserId, reason: string, now: DateTime): void {
    if (this._status === AppointmentStatus.COMPLETED) throw new CannotCancelCompletedError();
    if (this._status === AppointmentStatus.CANCELLED)  throw new AlreadyCancelledError();
    if (this.requiresApproval(now)) throw new CancellationApprovalRequiredError();
    this._status = AppointmentStatus.CANCELLED;
    this.addEvent(new AppointmentCancelled(this.id, by, reason));
  }
}

// application/scheduling/cancel-appointment.handler.ts
class CancelAppointmentHandler {
  async execute(cmd: CancelAppointmentCommand) {
    const appt = await this.repo.findById(cmd.appointmentId);
    if (!appt) throw new AppointmentNotFoundError(cmd.appointmentId);
    appt.cancel(cmd.actorId, cmd.reason, this.clock.now());
    await this.repo.save(appt);
  }
}
```

### 1.6 Доменные события — обязательны

Любое значимое изменение состояния агрегата → доменное событие. Имя — в **прошедшем времени** (`AppointmentCreated`, не `CreateAppointment`).

События публикуются через `aggregate.addEvent(...)` и попадают в **outbox** в той же транзакции, что и `repository.save(aggregate)`.

### 1.7 Команды и запросы разделены

- **Команда** меняет состояние, возвращает только `void` или идентификатор созданного агрегата. **Не возвращает DTO.**
- **Запрос** только читает, не меняет состояние, возвращает DTO/ViewModel.
- Команды идут через `CommandBus`, запросы — через `QueryBus`.
- Запросы могут читать **напрямую через MikroORM QueryBuilder или native SQL** (минуя domain-репозитории).

### 1.8 Глоссарий — закон

Все имена классов/методов/полей, которые соответствуют доменным понятиям, пишутся **точно так**, как в глоссарии `product.md` §2:

- `Appointment`, не `Booking`, `Reservation`, `Visit`.
- `WorkOrder`, не `Order`, `Job`, `Task`.
- `Sku`, не `Item`, `Material`, `Product` (как карточка номенклатуры).
- `Stock`, не `Inventory` (Inventory — это контекст).
- `Batch`, не `Lot`, `Parcel`, `BatchOfStock`.
- `Master` — это пользователь-исполнитель; не путать с `Owner` или `Manager`.
- `Branch` — филиал, не `Location`, `Office`, `Site`.
- `Bay` — рабочий пост в филиале, не `Slot` (слот — единица времени).

Если ты предложил название, которого нет в глоссарии и которое описывает доменное понятие — это **повод обновить глоссарий** в product.md, а не вводить локально.

---

## 2. Структура репозитория

Монорепо явно разделено на **3 платформы** на уровне `apps/` и `libs/`:

- **`apps/backend/`** + **`libs/backend/`** — NestJS-сторона (`platform:node`).
- **`apps/frontend/`** + **`libs/frontend/`** — Angular-сторона (`platform:angular`).
- **`libs/shared/`** — platform-agnostic (`platform:any`): контракты DTO, brand-типы ID, чистые утилиты.
- **`apps/mobile/`** + **`libs/mobile/`** и **`apps/desktop/`** + **`libs/desktop/`** — placeholder'ы под будущие приложения.

Каждый **bounded context** разбит на 4 **отдельных Nx-library** по слоям внутри `libs/backend/<ctx>/`. Это даёт `@nx/enforce-module-boundaries` физическую возможность блокировать кросс-слойные и кросс-контекстные импорты на уровне Nx-границ. Просто папка для этого не подходит — Nx не видит её как отдельную сущность с тегами.

`platform:node` ↔ `platform:angular` — взаимный запрет на импорты. Это делает невозможным случайный `import { Module } from '@nestjs/common'` в Angular-коде или, наоборот, импорт Angular-инжекторов в Nest-коде.

```
detailing-studio/
├── apps/
│   ├── backend/
│   │   └── api/                              # NestJS (тонкий bootstrap-слой)
│   ├── frontend/
│   │   ├── admin/                            # Angular SPA  (OWNER, MANAGER)
│   │   ├── admin-e2e/                        # Playwright
│   │   ├── master/                           # Angular PWA  (MASTER)
│   │   ├── master-e2e/
│   │   ├── client/                           # Angular PWA  (CLIENT)
│   │   └── client-e2e/
│   ├── mobile/                               # 📦 placeholder (Capacitor / Flutter / RN)
│   │   └── README.md
│   └── desktop/                              # 📦 placeholder (Tauri / Electron)
│       └── README.md
│
├── libs/
│   ├── shared/                               # platform:any — общее для FE и BE
│   │   ├── contracts/                        # OpenAPI/Zod-генерируемые DTO. Источник истины — BE controllers.
│   │   ├── types/                            # Brand-типы ID (UserId, AppointmentId, …)
│   │   └── util-pure/                        # Money, date, RU phone validator — чистый TS, без декораторов
│   │
│   ├── backend/                              # platform:node
│   │   ├── shared/
│   │   │   ├── ddd/                          # AggregateRoot, Entity, VO, DomainEvent
│   │   │   ├── outbox/                       # Outbox table + Service + Poller
│   │   │   ├── auth/                         # AuthGuard, CASL infra, JWT helpers
│   │   │   ├── http/                         # GlobalExceptionFilter, ProblemDetails
│   │   │   └── testing/                      # TestModuleBuilder, fixtures
│   │   ├── iam/                              # bounded context (см. § 2.1)
│   │   │   ├── domain/                       # Nx lib (scope:iam, type:domain, platform:node)
│   │   │   ├── application/                  # Nx lib (scope:iam, type:application, platform:node)
│   │   │   ├── infrastructure/               # Nx lib (scope:iam, type:infrastructure, platform:node)
│   │   │   └── interfaces/                   # Nx lib (scope:iam, type:interfaces, platform:node)
│   │   ├── catalog/                          # та же 4-слойная структура
│   │   ├── inventory/
│   │   ├── crm/
│   │   ├── scheduling/
│   │   ├── work-order/
│   │   ├── notifications/
│   │   └── billing/
│   │
│   ├── frontend/                             # platform:angular
│   │   ├── shared/
│   │   │   ├── ui/                           # Taiga UI обёртки + Tailwind токены
│   │   │   ├── ui-layout/                    # лейауты приложений
│   │   │   ├── data-access/                  # base http-клиент, interceptors
│   │   │   ├── auth/                         # AuthService, AuthGuard (Angular-стороны)
│   │   │   ├── i18n/                         # переводы
│   │   │   └── pwa/                          # SW, offline-очередь, push
│   │   ├── iam/                              # bounded context, FE-сторона (см. § 2.2)
│   │   │   ├── data-access/                  # Nx lib (scope:iam, type:data-access, platform:angular)
│   │   │   ├── feature-login/                # Nx lib (scope:iam, type:feature, platform:angular)
│   │   │   ├── feature-otp/
│   │   │   └── feature-oauth-callback/
│   │   ├── catalog/, inventory/, crm/, scheduling/, work-order/
│   │
│   ├── mobile/                               # 📦 placeholder
│   │   └── README.md
│   └── desktop/                              # 📦 placeholder
│       └── README.md
│
├── infra/
│   ├── nginx/, docker/, scripts/
├── docs/
│   ├── product.md
│   ├── engineering.md
│   └── adr/
├── .cursor/
│   └── rules/                                # Cursor-specific rules (.mdc)
├── .github/
│   └── workflows/
├── docker-compose.yml
├── docker-compose.test.yml
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── AGENTS.md                                 # ← ты здесь
```

**Apps/backend/api — тонкий bootstrap-слой:**
`app.module.ts` импортирует только `<Ctx>InfrastructureModule` и `<Ctx>InterfacesModule` каждого контекста. Никакого доменного кода в `apps/backend/api/src/` нет (кроме `main.ts`, `app.module.ts`, конфига и миграций). Вся бизнес-логика — в `libs/backend/<ctx>/*`.

### 2.1 Bounded context layout (backend) — 4 Nx-library на контекст

```
libs/backend/work-order/
├── domain/                              ← Nx lib  (scope:work-order, type:domain, platform:node)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── work-order.aggregate.ts
│   │   │   ├── work-order.events.ts
│   │   │   ├── work-order-status.enum.ts
│   │   │   ├── consumption-line.entity.ts
│   │   │   ├── photo-ref.value-object.ts
│   │   │   ├── work-order.repository.ts        # interface (port)
│   │   │   ├── policies/
│   │   │   └── errors/
│   │   └── index.ts                            # public re-exports
│   ├── eslint.config.mjs
│   ├── jest.config.ts
│   ├── project.json                            # tags: ["scope:work-order", "type:domain", "platform:node"]
│   ├── tsconfig.json
│   ├── tsconfig.lib.json
│   └── tsconfig.spec.json
├── application/                         ← Nx lib  (scope:work-order, type:application, platform:node)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── commands/
│   │   │   │   ├── close-work-order.command.ts
│   │   │   │   ├── close-work-order.handler.ts
│   │   │   │   └── ...
│   │   │   ├── queries/
│   │   │   │   ├── get-work-order.query.ts
│   │   │   │   ├── get-work-order.handler.ts
│   │   │   │   └── ...
│   │   │   ├── ports/
│   │   │   │   ├── photo-storage.port.ts
│   │   │   │   └── inventory-stock.port.ts     # ACL к другому контексту
│   │   │   ├── sagas/
│   │   │   │   └── close-work-order.saga.ts
│   │   │   ├── dto/
│   │   │   ├── errors/
│   │   │   ├── tokens.ts                       # DI-токены (Symbol)
│   │   │   └── work-order.application.module.ts
│   │   └── index.ts
│   └── ...
├── infrastructure/                      ← Nx lib  (scope:work-order, type:infrastructure, platform:node)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── persistence/
│   │   │   │   ├── work-order.schema.ts
│   │   │   │   ├── consumption-line.schema.ts
│   │   │   │   ├── work-order.mapper.ts
│   │   │   │   └── work-order.repository.impl.ts
│   │   │   ├── adapters/
│   │   │   │   ├── minio-photo-storage.adapter.ts
│   │   │   │   └── inventory-stock-port.adapter.ts
│   │   │   └── work-order.infrastructure.module.ts
│   │   └── index.ts
│   └── ...
└── interfaces/                          ← Nx lib  (scope:work-order, type:interfaces, platform:node)
    ├── src/
    │   ├── lib/
    │   │   ├── http/
    │   │   │   ├── work-order.controller.ts
    │   │   │   ├── work-order.dto.ts
    │   │   │   └── work-order.swagger.ts
    │   │   ├── ws/
    │   │   │   └── work-order.gateway.ts
    │   │   └── work-order.interfaces.module.ts
    │   └── index.ts
    └── ...
```

**Подключение в apps/backend/api:**

```ts
// apps/backend/api/src/app/app.module.ts
import { WorkOrderInfrastructureModule } from '@det/backend/work-order/infrastructure';
import { WorkOrderInterfacesModule }     from '@det/backend/work-order/interfaces';
import { IamInfrastructureModule }       from '@det/backend/iam/infrastructure';
import { IamInterfacesModule }           from '@det/backend/iam/interfaces';
// и т.д.

@Module({
  imports: [
    ConfigModule.forRoot({ /* ... */ }),
    MikroOrmModule.forRootAsync({ /* ... */ }),
    OutboxModule,
    IamInfrastructureModule, IamInterfacesModule,
    WorkOrderInfrastructureModule, WorkOrderInterfacesModule,
    // catalog, inventory, crm, scheduling, notifications, billing
  ],
})
export class AppModule {}
```

**Module-классы внутри библиотек:**
- `<Ctx>ApplicationModule` (в `libs/backend/<ctx>/application/`) регистрирует CommandHandlers, QueryHandlers, Sagas; импортирует `CqrsModule`.
- `<Ctx>InfrastructureModule` (в `libs/backend/<ctx>/infrastructure/`) импортирует `<Ctx>ApplicationModule`, регистрирует `MikroOrmModule.forFeature(...)`, репозитории и порты-адаптеры через DI-токены; экспортирует `<Ctx>ApplicationModule` транзитивно.
- `<Ctx>InterfacesModule` (в `libs/backend/<ctx>/interfaces/`) импортирует `<Ctx>InfrastructureModule`, регистрирует controllers и gateways.

`apps/backend/api` импортирует только `Infrastructure` + `Interfaces` модули каждого контекста. Application подтягивается транзитивно через Infrastructure.

### 2.2 Bounded context layout (frontend) — feature-libs и data-access

```
libs/frontend/work-order/
├── data-access/                          ← Nx lib  (scope:work-order, type:data-access, platform:angular)
│   ├── src/lib/work-order.api.ts                 # HttpClient-обёртка, типы из @det/shared/contracts
│   ├── src/lib/work-order.store.ts               # signal-store (если данные общие на несколько feature-libs)
│   └── src/index.ts
├── feature-active-orders/                ← Nx lib  (scope:work-order, type:feature, platform:angular)
│   ├── src/lib/active-orders.routes.ts
│   ├── src/lib/active-orders-page.component.ts
│   ├── src/lib/active-orders-page.component.html
│   ├── src/lib/active-orders-page.component.scss
│   ├── src/lib/active-orders.store.ts            # local signal-store (если данные специфичны)
│   └── src/lib/components/
└── feature-work-order-detail/            ← Nx lib  (scope:work-order, type:feature, platform:angular)
```

Каждая `feature-*` — отдельная Nx-lib. Подключается в `apps/frontend/<admin|master|client>/src/app/app.routes.ts` через lazy `loadChildren`.

**Кросс-feature правило:** `feature-X` **не может** импортировать `feature-Y` (даже внутри одного scope). Композиция — на уровне `apps/frontend/<app>/src/app/app.routes.ts`. Общие данные между feature'ами — через `data-access` контекста.

### 2.3 Shared layer — platform:any

`libs/shared/` содержит **только** код, у которого нет зависимостей ни от Angular, ни от NestJS, ни от MikroORM:

- `libs/shared/contracts/` — генерируется автоматически из NestJS-controllers (через `@nestjs/swagger` + `openapi-typescript-codegen`). Не редактируется руками. FE импортирует типы запросов/ответов отсюда — это убирает дрейф DTO между сторонами.
- `libs/shared/types/` — Brand-типы ID (`UserId`, `AppointmentId`, …) и базовые value-object'ы (`Money`, `PhoneE164`), которые имеют смысл и в браузере, и на сервере.
- `libs/shared/util-pure/` — чистые функции: парсинг даты, расчёт TVA, валидация телефона. Никаких `@Injectable`, никаких `Observable` — только вход/выход.

Если есть соблазн положить что-то сюда «универсальное», но оно тащит `@angular/core` или `@nestjs/common` — это сигнал, что ему сюда нельзя. Перенеси либо в `libs/frontend/shared/`, либо в `libs/backend/shared/`.

---

## 3. Nx tags и границы (enforce-module-boundaries)

Все libs **обязаны** иметь **3 тега**: `scope:*`, `type:*`, `platform:*`. Без полного набора ESLint красным.

**Scope tags** (что за контекст):

```
scope:shared            ← общее (FE+BE+mobile+desktop)
scope:iam, scope:catalog, scope:inventory, scope:crm,
scope:scheduling, scope:work-order, scope:notifications, scope:billing
scope:app               ← конкретное приложение (apps/*)
```

**Type tags** (что за слой):

```
# Backend layers
type:domain, type:application, type:infrastructure, type:interfaces

# Frontend layers
type:feature, type:data-access, type:ui

# Shared
type:contracts          ← OpenAPI/Zod-генерируемые DTO
type:types              ← brand-типы ID
type:util               ← чистые функции

# Apps
type:app
```

**Platform tags:**

```
platform:node           ← NestJS-сторона
platform:angular        ← Angular-сторона
platform:mobile         ← будущее: Capacitor/Flutter/RN
platform:desktop        ← будущее: Tauri/Electron
platform:any            ← без зависимостей от платформы (libs/shared/*)
```

### 3.1 Правила импорта между platforms (главная стена)

```
platform:node      → platform:node, platform:any           # Nest не видит Angular
platform:angular   → platform:angular, platform:any        # Angular не видит Nest
platform:mobile    → platform:mobile, platform:angular, platform:any   # mobile может тянуть FE shared
platform:desktop   → platform:desktop, platform:angular, platform:any  # desktop может тянуть FE shared
platform:any       → platform:any                          # shared имеет минимум зависимостей
```

### 3.2 Правила импорта между layers

```
type:domain          → type:domain (своего scope) + type:util/types (scope:shared)
type:application     → type:domain, type:application (своего scope) + scope:shared
type:infrastructure  → type:domain, type:application, type:infrastructure (своего scope) + scope:shared
type:interfaces      → type:application, type:interfaces (своего scope) + scope:shared
type:feature         → type:data-access, type:ui (своего scope) + scope:shared + type:contracts
type:data-access     → type:data-access (своего scope) + type:contracts + scope:shared
type:ui              → type:ui + scope:shared (только types/util)
type:contracts       → type:contracts, type:types (других contracts/types)
type:types           → type:types, type:util
type:util            → type:util, type:types
```

### 3.3 Правила импорта между scopes

- `scope:shared` импортируется откуда угодно.
- `scope:<ctx>` импортируется только из:
  - `scope:<ctx>` (внутри своего контекста, любой layer/platform);
  - `scope:app` (apps подключают features и Nest-модули);
  - **Кросс-context импорты только через `application/ports/`** на BE и через **`data-access` другого контекста** на FE.

### 3.4 Конфигурация ESLint (фрагмент)

```js
// eslint.config.mjs (root)
{
  rules: {
    '@nx/enforce-module-boundaries': ['error', {
      depConstraints: [
        // ───── Platform walls ─────
        { sourceTag: 'platform:node',     onlyDependOnLibsWithTags: ['platform:node', 'platform:any'] },
        { sourceTag: 'platform:angular',  onlyDependOnLibsWithTags: ['platform:angular', 'platform:any'] },
        { sourceTag: 'platform:mobile',   onlyDependOnLibsWithTags: ['platform:mobile', 'platform:angular', 'platform:any'] },
        { sourceTag: 'platform:desktop',  onlyDependOnLibsWithTags: ['platform:desktop', 'platform:angular', 'platform:any'] },
        { sourceTag: 'platform:any',      onlyDependOnLibsWithTags: ['platform:any'] },

        // ───── Backend layers ─────
        { sourceTag: 'type:domain',         onlyDependOnLibsWithTags: ['type:domain', 'type:util', 'type:types'] },
        { sourceTag: 'type:application',    onlyDependOnLibsWithTags: ['type:domain', 'type:application', 'type:contracts', 'type:util', 'type:types'] },
        { sourceTag: 'type:infrastructure', onlyDependOnLibsWithTags: ['type:domain', 'type:application', 'type:infrastructure', 'type:contracts', 'type:util', 'type:types'] },
        { sourceTag: 'type:interfaces',     onlyDependOnLibsWithTags: ['type:application', 'type:interfaces', 'type:contracts', 'type:util', 'type:types'] },

        // ───── Frontend layers ─────
        { sourceTag: 'type:feature',     onlyDependOnLibsWithTags: ['type:data-access', 'type:ui', 'type:contracts', 'type:util', 'type:types'] },
        { sourceTag: 'type:data-access', onlyDependOnLibsWithTags: ['type:data-access', 'type:contracts', 'type:util', 'type:types'] },
        { sourceTag: 'type:ui',          onlyDependOnLibsWithTags: ['type:ui', 'type:util', 'type:types'] },

        // ───── Shared layers ─────
        { sourceTag: 'type:contracts', onlyDependOnLibsWithTags: ['type:contracts', 'type:types'] },
        { sourceTag: 'type:types',     onlyDependOnLibsWithTags: ['type:types', 'type:util'] },
        { sourceTag: 'type:util',      onlyDependOnLibsWithTags: ['type:util', 'type:types'] },

        // ───── Scope walls (по одному на bounded context) ─────
        { sourceTag: 'scope:iam',          onlyDependOnLibsWithTags: ['scope:iam', 'scope:shared'] },
        { sourceTag: 'scope:catalog',      onlyDependOnLibsWithTags: ['scope:catalog', 'scope:shared'] },
        { sourceTag: 'scope:inventory',    onlyDependOnLibsWithTags: ['scope:inventory', 'scope:shared'] },
        { sourceTag: 'scope:crm',          onlyDependOnLibsWithTags: ['scope:crm', 'scope:shared'] },
        { sourceTag: 'scope:scheduling',   onlyDependOnLibsWithTags: ['scope:scheduling', 'scope:shared'] },
        { sourceTag: 'scope:work-order',   onlyDependOnLibsWithTags: ['scope:work-order', 'scope:shared'] },
        { sourceTag: 'scope:notifications',onlyDependOnLibsWithTags: ['scope:notifications', 'scope:shared'] },
        { sourceTag: 'scope:billing',      onlyDependOnLibsWithTags: ['scope:billing', 'scope:shared'] },
      ]
    }]
  }
}
```

### 3.5 Кросс-feature правило (frontend)

Дополнительно к scope-стенам: даже **внутри одного scope** запрещён импорт `feature → feature`. Это сделано через ESLint-overrides:

```js
// eslint.config.mjs
{
  files: ['libs/frontend/*/feature-*/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['@det/frontend/*/feature-*'], message: 'Feature → feature import запрещён. Используй apps/frontend/<app>/src/app/app.routes.ts для композиции или data-access для общих данных.' },
      ]
    }]
  }
}
```

### 3.4 Запрет `any` и небезопасных доступов

ESLint:

```js
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-unsafe-assignment': 'error',
'@typescript-eslint/no-unsafe-call': 'error',
'@typescript-eslint/no-unsafe-member-access': 'error',
'@typescript-eslint/no-unsafe-return': 'error',
```

Если ты считаешь, что без `any` не обойтись, — **остановись**, прочитай типы тщательнее, спроси пользователя. `any` в этом проекте — повод вернуть PR на доработку.

---

## 4. Порядок написания нового use case (TDD)

Для каждой новой команды/запроса **строго в этом порядке:**

1. Прочитать в `product.md` соответствующий FR-X.Y.Z и user story.
2. Прочитать в `engineering.md` § 2 (агрегат) и § 3 (CQRS) для контекста.
3. **Сначала** написать unit-тест на domain-метод (если меняется domain).
4. Реализовать domain-метод (и события).
5. Написать integration-тест на CommandHandler/QueryHandler.
6. Реализовать handler.
7. Дописать DTO и controller-метод; добавить swagger-аннотации.
8. Дописать e2e (если это критический путь из MVP-скоупа).
9. Frontend: data-access (api-метод и signal-store), затем feature lib (routed component).
10. Прогнать `pnpm nx affected --target=lint,typecheck,test` локально.
11. Открыть PR; в описании сослаться на FR и user story.

**Никогда не пиши код без теста.** Если задача «починить баг» — тест должен сначала упасть, потом стать зелёным.

---

## 5. Размер PR и шаг работы

- **Один PR = один вертикальный срез** (одна user story или один FR-X.Y.Z).
- Размер PR — до **400 строк изменений** без учёта lock-файлов и сгенерированного.
- Если получается больше — **раздели** на несколько последовательных PR.
- В одном PR не смешивай: новый функционал + рефакторинг + правки лишних файлов. Каждое — отдельным PR.

### 5.1 Заголовок и описание PR

Заголовок: Conventional Commits.

```
feat(scheduling): US-E5-01 create appointment from manager
fix(inventory): correct FEFO selection when batch expires today
chore(api): bump mikro-orm to 6.4.1
test(work-order): add invariant tests for closing without after-photo
```

Тело PR:

```markdown
## What
Один абзац: что сделали.

## Why
FR-X.Y.Z, US-EX-YY: ссылка на конкретные требования.

## How
Тезисно: ключевые решения. Если непонятный момент — диаграмма sequence или комментарий «почему так».

## Tests
Что покрыто: unit / integration / e2e. Если что-то не покрыто — обоснование.

## Risk
Что может сломаться. Миграции БД? Обратная совместимость API?

## Checklist
- [ ] Domain layer не импортирует ничего из infrastructure
- [ ] Все cross-context зависимости — через ports
- [ ] Доменные события публикуются через aggregate.addEvent()
- [ ] Имена соответствуют глоссарию
- [ ] Lint / typecheck / unit / integration зелёные
- [ ] PR ≤ 400 LoC (исключая lock-файлы)
```

---

## 6. Запрещённые действия

Эти вещи нельзя делать **никогда** без явного разрешения пользователя:

1. **`git push --force` в `main` или `develop`.**
2. **`git rebase`/`reset --hard` на чужих ветках.**
3. **Удалять миграции БД.** Только новые миграции «накатом».
4. **Делать `data migration` внутри `schema migration`.** Это разные миграции.
5. **Хардкодить секреты.** Только через `ConfigService` и `.env`.
6. **Логировать ПДн в plain виде.** Использовать `pino-redact`.
7. **Игнорировать ESLint/TypeScript ошибки** через `// eslint-disable` или `// @ts-ignore` без согласования. Если нужно — `// @ts-expect-error` с указанием issue/ADR.
8. **Использовать `as Type` (type assertion)** для обхода типов. Только для интеропа с runtime-проверкой.
9. **Использовать `any`, `unknown` без type-narrowing, `Object`, `{}`.**
10. **Менять `domain/` без обсуждения.** Это самая хрупкая зона.
11. **Использовать сервис-локатор (`Container.get(...)`).** Только конструкторное DI.
12. **Импортировать из `**/dist/**`** — только из исходников.
13. **Создавать «общий» package в `libs/shared/`, `libs/backend/shared/` или `libs/frontend/shared/` для бизнес-логики.** Бизнес-логика живёт в bounded context.
14. **Пушить файлы с расширениями `.env`, `.pfx`, `.p12`, `.pem` (кроме `*.example`).**
15. **Менять `.cursor/rules/`, `AGENTS.md`, `docs/adr/`** без явного запроса.

---

## 7. Команды для агента

### 7.1 Локальная проверка перед коммитом

```bash
pnpm install --frozen-lockfile
pnpm nx affected --target=lint --parallel=3
pnpm nx affected --target=typecheck --parallel=3
pnpm nx affected --target=test --parallel=3
```

### 7.2 Запуск backend локально

```bash
docker-compose up -d postgres redis minio minio-init
pnpm nx serve api
```

### 7.3 Запуск frontend

```bash
pnpm nx serve admin           # http://localhost:4200
pnpm nx serve master          # http://localhost:4201
pnpm nx serve client          # http://localhost:4202
```

### 7.4 Миграции

```bash
pnpm nx run api:migration:create --name=add_appointment_table
pnpm nx run api:migration:up
pnpm nx run api:migration:down              # только в dev
```

### 7.5 Тестирование

```bash
pnpm nx test work-order-domain              # unit для domain
pnpm nx run api:test-integration            # integration с Testcontainers
pnpm nx run-many --target=e2e --projects=admin-e2e,client-e2e,master-e2e
```

### 7.6 E2E с реальным API

```bash
docker-compose -f docker-compose.test.yml up -d
pnpm nx e2e admin-e2e --headed
```

---

## 8. Backend-специфичные правила

### 8.1 NestJS-модули

- Один контекст = **три** Nest-модуля по слоям (domain — без модуля, чистый TS):
  - `<Ctx>ApplicationModule` (в `libs/<ctx>/application/`) — CommandHandlers, QueryHandlers, Sagas; импортирует `CqrsModule`.
  - `<Ctx>InfrastructureModule` (в `libs/<ctx>/infrastructure/`) — импортирует `<Ctx>ApplicationModule`, регистрирует `MikroOrmModule.forFeature(...)`, репозитории и порты-адаптеры через DI-токены.
  - `<Ctx>InterfacesModule` (в `libs/<ctx>/interfaces/`) — импортирует `<Ctx>InfrastructureModule`, регистрирует controllers и gateways.
- `apps/backend/api/src/app/app.module.ts` импортирует только `<Ctx>InfrastructureModule` + `<Ctx>InterfacesModule` каждого контекста. ApplicationModule подтягивается транзитивно.
- Между контекстами экспортируются **только порты** (interfaces) и DTO. Никаких domain-классов.

### 8.2 DI

- **Только constructor injection.** `@Inject()` decorator только когда регистрируется по токену.
- Repository interface в domain → token в `application/` → имплементация в `infrastructure/`.

```ts
// application/work-order.tokens.ts
export const WORK_ORDER_REPOSITORY = Symbol('WORK_ORDER_REPOSITORY');

// application/commands/close-work-order.handler.ts
@CommandHandler(CloseWorkOrderCommand)
export class CloseWorkOrderHandler {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(PHOTO_STORAGE_PORT)    private readonly photoStorage: IPhotoStoragePort,
    private readonly clock: Clock,                    // Clock — domain port для now()
  ) {}
  // ...
}
```

### 8.3 Транзакции и Unit of Work

- Каждая команда выполняется внутри `em.transactional(...)` (через middleware `MikroORM RequestContext`).
- В рамках транзакции: загрузить агрегат → вызвать метод → сохранить → outbox-события.
- **Никаких `forkEntityManager()` вне UoW middleware.**

### 8.4 Outbox

- Все доменные события агрегата сохраняются в таблицу `outbox_events` в **той же транзакции**, что и агрегат.
- Outbox-poller (BullMQ repeating job, 1 секунда) забирает unpublished, публикует в EventBus / отправляет интеграционным адаптерам.
- **Никогда** не отправляй уведомление / не вызывай внешний сервис прямо из command handler. Только через outbox.

### 8.5 Идентификаторы

- Все ID — **UUID v4**, генерируются на стороне приложения (`crypto.randomUUID()`), **не БД**.
- Используй **бренд-типы** для разделения видов ID (см. engineering.md § 6.9):

  ```ts
  export type AppointmentId = Brand<string, 'AppointmentId'>;
  ```

### 8.6 Деньги

- Класс `Money` живёт в `libs/shared/util-pure/money.value-object.ts` (он же `@det/shared/util`).
- Внутри — `bigint` копейки + `currency: 'RUB'`.
- В БД: `BIGINT cents` + (опц.) `TEXT currency`.
- **Запрещено** хранить деньги как `number` (плавающая точка).

### 8.7 Время

- Domain-сервис `Clock` (порт): `now(): DateTime`.
- В тестах подменяется на `FakeClock`.
- В domain **запрещено** вызывать `new Date()`, `Date.now()`. Только через `Clock`.

### 8.8 Ошибки

- Все доменные ошибки наследуются от `DomainError` (см. engineering.md § 6.8) и имеют `code: string` и `httpStatus: number`.
- В HTTP-ответах ошибки сериализуются в **RFC 7807 Problem Details**.
- **Никаких `throw new Error('something')`** в domain — только типизированные `DomainError`-наследники.

### 8.9 Валидация

- На границе HTTP — `class-validator`/Zod на DTO.
- Внутри domain — инварианты в конструкторах/фабриках, без декораторов.
- В БД — UNIQUE/CHECK/FK как страховка.

### 8.10 Логирование

- **Pino** на всё. **Никаких** `console.log` в коммитах.
- Логи структурированные, JSON. PII redacted (`pino.redact: ['phone', 'email', 'fullName']`).
- На каждый запрос — `requestId`, прокинутый в логи всего запроса.

---

## 9. Frontend-специфичные правила

### 9.1 Angular standalone

- Все компоненты **standalone** (`standalone: true`). Никаких NgModule, кроме root.
- `provideRouter`, `provideHttpClient`, `provideZonelessChangeDetection` (опц.) в `bootstrapApplication`.

### 9.2 State management

- **Только Angular Signals + сервисы.**
- **Запрещены:** NgRx (любой), TanStack Query for Angular, Akita, ngxs.
- Один store на feature: `<feature-name>.store.ts`, `@Injectable({ providedIn: 'root' | 'any' })`.
- Внутри: `signal()`, `computed()`, `effect()`, `resource()` (Angular 19+ для серверного state).

### 9.3 HTTP

- Каждый контекст имеет `data-access/<ctx>.api.ts` — единая точка HTTP-вызовов.
- Используется `inject(HttpClient)` (functional injection, без `constructor`).
- Базовый URL — через DI токен `API_BASE_URL`.

### 9.4 Реактивные формы

- Только Reactive Forms (`FormBuilder`, `FormGroup`, `FormArray`).
- **Запрещены** Template-driven forms (`[(ngModel)]` в формах).
- Валидаторы — переиспользуемые из `@det/shared/util` (libs/shared/util-pure/validators/).

### 9.5 Taiga UI + Tailwind

- **Цвета, типографика, состояния компонентов — Taiga UI.** Никаких хардкодных цветов в Tailwind (`bg-blue-500`, `text-red-600`).
- **Layout, spacing, grid — Tailwind.** Никаких `style="margin: 16px"`.
- Темизация — через атрибут `[attr.tuiTheme]` на root элементе приложения.

```html
<!-- ✓ хорошо -->
<div class="flex gap-4 p-6 md:grid md:grid-cols-3">
  <button tuiButton appearance="primary">Сохранить</button>
</div>

<!-- ✗ плохо -->
<button class="bg-blue-500 text-white px-4 py-2 rounded">Сохранить</button>
```

### 9.6 Маршрутизация

- Lazy loading **обязателен** для feature lib: `loadChildren: () => import('@det/frontend/work-order/feature-active-orders').then(m => m.routes)`.
- Guards для авторизации: `authGuard`, `roleGuard(['OWNER'])`, `branchAccessGuard`.

### 9.7 PWA (master, client)

- Service Worker конфигурируется через `@angular/service-worker`.
- Master-app: offline-очередь мутаций через IndexedDB (`idb`) + Background Sync API.
- Client-app: только read-кэш для просмотра записей.
- Admin-app: **PWA не нужен**, обычная SPA.

### 9.8 i18n

- Все строки UI — через `@ngx-translate/core` (или Angular i18n) и `libs/frontend/shared/i18n/ru.json`.
- **Запрещено** хардкодить русские тексты прямо в шаблонах.

---

## 10. Тестирование

### 10.1 Пирамида

- **70%** unit-тестов на `domain/` (Jest).
- **20%** integration-тестов на `application/` (Jest + Testcontainers с реальной PG).
- **10%** e2e на критические пути MVP (Playwright).

### 10.2 Domain unit-тесты

- Тестируется поведение агрегата: методы, инварианты, события.
- **Никаких моков** в domain-тестах.
- Один тест ≤ 1 мс.
- Тестовые билдеры (`AppointmentTestBuilder.create().withSlot(...).withStatus(...).build()`).

### 10.3 Application integration-тесты

- Поднимается реальная PG через Testcontainers.
- Внешние адаптеры (SMS, Telegram, ЮKassa) — мокаются.
- Тестируется command handler целиком: команда → агрегат → БД → outbox.

### 10.4 E2E

- Playwright, 5 критических путей из engineering.md § 13.4.
- Запускаются в CI на PR.

### 10.5 Покрытие

- Domain ≥ 85%.
- Application ≥ 75%.
- Infrastructure ≥ 60% (через integration).

---

## 11. Документация и ADR

### 11.1 Когда пишется ADR

- Меняется библиотека (ORM, queue, http-server adapter).
- Меняется паттерн (CQRS approach, transaction boundaries).
- Принимается решение, в котором будут сомневаться через 3 месяца.

### 11.2 Шаблон ADR
См. engineering.md § 14. Файл: `docs/adr/ADR-NNN-short-name.md`.

### 11.3 Когда обновляется product.md / engineering.md

- Меняется FR (`product.md`).
- Меняется агрегат, его инварианты, события (`engineering.md`).
- Добавляется новый bounded context (`engineering.md`).

**Изменение спецификации делается в том же PR**, что и изменение кода.

---

## 12. Безопасность

### 12.1 Секреты

- `.env` не коммитится. `.env.example` коммитится с описанием каждой переменной.
- Доступ только через `ConfigService` (никаких `process.env` напрямую кроме `apps/backend/api/src/config/`).

### 12.2 Авторизация

- Каждый эндпоинт защищён через `@UseGuards(AuthGuard, AbilityGuard)` (CASL).
- В CASL — RBAC + ABAC (см. engineering.md § 9.3).
- **Запрещено** делать «временно открытые» эндпоинты в `production` profile.

### 12.3 152-ФЗ

- При работе с `Client` агрегатом — запись в `pii_access_log`.
- При выводе ПДн в логах — `pino.redact`.
- Анонимизация клиента — отдельная команда `AnonymizeClientCommand`, не «delete».

### 12.4 Загрузка файлов

- Проверка magic bytes через `file-type`.
- MAX_SIZE 10 МБ.
- Re-encoding через `sharp` (anti-malware).

---

## 13. Что делать в спорных ситуациях

### 13.1 Если требование непонятно

1. Прочитать FR/user story в `product.md`.
2. Если всё равно непонятно — **не угадывай**. Открой комментарий в PR с конкретным вопросом или сообщи пользователю.
3. Если делаешь предположение — явно зафиксируй его в описании PR в секции «Assumptions».

### 13.2 Если правило мешает

1. **Не нарушай его молча.**
2. Подними вопрос с пользователем: «правило X блокирует решение Y, предлагаю либо изменить правило (тогда обновим этот файл), либо переписать решение, как X».
3. Если правило меняется — обновляется этот `AGENTS.md` тем же PR + пишется ADR.

### 13.3 Если нужно отступить от спецификации

1. **Не отступай молча.**
2. Сначала обнови `product.md` или `engineering.md` отдельным PR (или тем же — но явно).
3. Потом пиши код по обновлённой спецификации.

---

## 14. Анти-паттерны (узнаём в лицо)

### 14.1 Анемичная модель

```ts
// ✗ плохо
class Appointment {
  status: string;
  startsAt: Date;
}
class AppointmentService {
  cancel(a: Appointment, reason: string) {
    if (a.status === 'COMPLETED') throw new Error();
    a.status = 'CANCELLED';
    // ...
  }
}

// ✓ хорошо
class Appointment {
  cancel(reason: string, by: UserId, now: DateTime): void {
    if (this._status === Status.COMPLETED) throw new CannotCancelCompletedError();
    this._status = Status.CANCELLED;
    this.addEvent(new AppointmentCancelled(this.id, by, reason, now));
  }
}
```

### 14.2 Domain зависит от инфраструктуры

```ts
// ✗ плохо
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';

class WorkOrder {
  constructor(private readonly repo: Repository<WorkOrder>) {}
  async close() {
    Logger.log('closing');
    await this.repo.save(this);
  }
}

// ✓ хорошо
class WorkOrder extends AggregateRoot {
  close(now: DateTime): void {
    if (!this.canClose()) throw new CannotCloseError();
    this._closedAt = now;
    this.addEvent(new WorkOrderClosed(this.id, now));
  }
}
```

### 14.3 Cross-aggregate ссылка

```ts
// ✗ плохо
class WorkOrder {
  client: Client;     // прямая ссылка на другой агрегат
}

// ✓ хорошо
class WorkOrder {
  clientId: ClientId; // только идентификатор
}
```

### 14.4 Сервис меняет внутренности агрегата

```ts
// ✗ плохо
class WorkOrderService {
  close(wo: WorkOrder) {
    if (wo.photosBefore.length === 0) throw new Error();
    wo.status = 'CLOSED';        // прямой доступ к приватному полю
  }
}

// ✓ хорошо
class WorkOrderService {
  close(wo: WorkOrder) {
    wo.close();                  // делегирование агрегату
  }
}
```

### 14.5 ORM-сущность как domain-агрегат

```ts
// ✗ плохо
@Entity()
class Appointment {
  @PrimaryKey() id: string;
  @Property() status: string;
  // бизнес-методы прямо здесь
  cancel() { /* ... */ }
}

// ✓ хорошо: разделение
// domain/appointment.aggregate.ts          — чистый класс с методами
// infrastructure/appointment.schema.ts     — @Entity для MikroORM
// infrastructure/appointment.mapper.ts     — toDomain/toPersistence
```

### 14.6 Скрытое side-effect в query

```ts
// ✗ плохо
@QueryHandler(GetAppointmentQuery)
class GetAppointmentHandler {
  async execute(q) {
    const appt = await this.repo.findById(q.id);
    appt.markViewed();           // мутация в query!
    await this.repo.save(appt);
    return appt;
  }
}

// ✓ хорошо: query чистый, мутация — отдельная команда
```

---

## 15. Чек-лист для финального self-review перед PR

Перед тем как открыть PR, агент проходит этот список:

- [ ] Прочитан FR/user story в `product.md`.
- [ ] Прочитан соответствующий раздел в `engineering.md`.
- [ ] Domain-слой не импортирует ничего из `infrastructure/`, NestJS, MikroORM.
- [ ] Кросс-context импорты только через `application/ports/`.
- [ ] Persistence-схемы и domain-агрегаты — разные классы. Маппер написан.
- [ ] Команда меняет один агрегат. Кросс-агрегатные сценарии — через события + saga.
- [ ] Бизнес-логика живёт в методах агрегата, не в сервисе.
- [ ] Каждое значимое изменение состояния → доменное событие в прошедшем времени.
- [ ] Domain-events попадают в outbox в той же транзакции.
- [ ] Имена соответствуют глоссарию (`product.md` § 2).
- [ ] Команды возвращают `void` или ID. Запросы возвращают DTO.
- [ ] Контроллер использует CASL guard (`AbilityGuard`).
- [ ] Аутентификация — через JWT-стратегию.
- [ ] Все ID — UUID v4 + бренд-тип.
- [ ] Деньги — `Money` VO, не `number`.
- [ ] Время — через `Clock` port, не `new Date()`.
- [ ] Доменные ошибки — `DomainError`-наследники, в HTTP — Problem Details.
- [ ] Unit-тесты на domain (≥ 85% покрытие новых строк).
- [ ] Integration-тест на handler.
- [ ] E2E-тест, если это критический путь.
- [ ] Frontend: signals + services. Никакого NgRx/TanStack Query.
- [ ] Reactive forms, `class-validator` на бэкенде, переиспользуемые валидаторы.
- [ ] Цвета — Taiga UI, layout — Tailwind.
- [ ] Lazy loading для feature lib.
- [ ] Логи через Pino, PII redacted.
- [ ] Нет `any`, `// @ts-ignore`.
- [ ] Нет `console.log`.
- [ ] Нет хардкодных секретов и URL.
- [ ] PR ≤ 400 LoC (без lock-файлов).
- [ ] Conventional Commit заголовок.
- [ ] Описание PR содержит What/Why/How/Tests/Risk.
- [ ] `pnpm nx affected --target=lint,typecheck,test` зелёный локально.
- [ ] Если меняется спецификация — `product.md`/`engineering.md` обновлены тем же или предшествующим PR.

---

## 16. Быстрые ссылки

| Документ | Зачем |
|----------|-------|
| [`docs/product.md`](./docs/product.md) | Глоссарий, персонажи, RBAC, FR, user stories, NFR, UI/UX, MVP scope |
| [`docs/engineering.md`](./docs/engineering.md) | C4, доменные модели, CQRS, REST API, ER, фронт, бэк, безопасность, инфра, CI/CD, тесты, ADR |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records |
| [`.cursor/rules/`](./.cursor/rules/) | Cursor-специфичные правила по слоям |

---

> **Если ты дочитал — ты готов писать код.** Начинай с прочтения соответствующего FR в `product.md` и раздела в `engineering.md` под твою задачу.
<!-- project configuration end-->
