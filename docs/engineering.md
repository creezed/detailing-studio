# Инженерная спецификация. MVP B2B SaaS для детейлинг-студии

> **Документ:** Engineering Specification
> **Продукт:** Веб-SPA приложение учёта материалов и онлайн-записи для детейлинг-студии
> **Стек:** Nx (monorepo) · Angular + Taiga UI + Tailwind · NestJS · MikroORM · PostgreSQL · Redis · MinIO
> **Архитектурный стиль:** DDD (строгий) · Гексагональная архитектура · CQRS · in-process domain events
> **Статус документа:** Draft v0.1
> **Связанный документ:** [product.md](product.md) — продуктовое ТЗ

---

## Оглавление

- [1. Архитектура системы (C4)](#1-архитектура-системы-c4)
- [2. Доменная модель (DDD)](#2-доменная-модель-ddd)
- [3. Прикладной слой (CQRS)](#3-прикладной-слой-cqrs)
- [4. REST API](#4-rest-api)
- [5. Модель данных (persistence)](#5-модель-данных-persistence)
- [6. Backend архитектура (NestJS + DDD + MikroORM)](#6-backend-архитектура-nestjs--ddd--mikroorm)
- [7. Frontend архитектура (Nx + Angular + Signals)](#7-frontend-архитектура-nx--angular--signals)
- [8. Интеграции](#8-интеграции)
- [9. Безопасность и авторизация](#9-безопасность-и-авторизация)
- [10. Observability](#10-observability)
- [11. Инфраструктура](#11-инфраструктура)
- [12. CI/CD](#12-cicd)
- [13. Стратегия тестирования](#13-стратегия-тестирования)
- [14. ADR (Architecture Decision Records)](#14-adr-architecture-decision-records)

---

## 1. Архитектура системы (C4)

### 1.1 Контекстная диаграмма (C4 Level 1)

> Диаграммы представлены в текстовом виде (Mermaid + ASCII). При оформлении документа в репозитории — экспортировать в PlantUML/Structurizr.

```mermaid
flowchart TB
  subgraph external[Внешние системы]
    SMS[SMS-провайдер<br/>SMS.ru]
    SMTP[Email-провайдер<br/>SMTP / Mailgun]
    TG[Telegram Bot API]
    YK[ЮKassa<br/>заглушка в MVP]
    YID[Яндекс ID<br/>OAuth 2.0]
    TGAUTH[Telegram Login Widget]
  end

  subgraph users[Пользователи]
    OWN[Владелец]
    MAN[Менеджер]
    MAS[Мастер]
    CL[Клиент]
  end

  subgraph system[Detailing SaaS — Single tenant MVP]
    SYS[Система учёта и онлайн-записи]
  end

  OWN -- HTTPS --> SYS
  MAN -- HTTPS --> SYS
  MAS -- HTTPS --> SYS
  CL  -- HTTPS --> SYS

  SYS -- SMS --> SMS
  SYS -- Email --> SMTP
  SYS -- Bot API --> TG
  SYS -- Recurring --> YK
  CL  -- OAuth --> YID
  CL  -- OAuth --> TGAUTH
```

### 1.2 Контейнерная диаграмма (C4 Level 2)

```mermaid
flowchart TB
  subgraph clients[Клиентские приложения]
    ADMIN[admin-app<br/>Angular SPA]
    MASTER[master-app<br/>Angular PWA]
    CLIENT[client-app<br/>Angular PWA]
  end

  subgraph backend[Backend]
    API[api<br/>NestJS<br/>REST + Swagger]
    BOT[telegram-bot<br/>Telegraf<br/>в одном процессе с api]
    WORKER[notifications-worker<br/>BullMQ consumer]
    SCHED[scheduler<br/>BullMQ repeating jobs]
  end

  subgraph storage[Хранилища]
    PG[(PostgreSQL 16<br/>основная БД + outbox + audit)]
    REDIS[(Redis 7<br/>BullMQ + cache + rate-limit)]
    MINIO[(MinIO<br/>S3-совместимое<br/>фото нарядов, бэкапы)]
  end

  subgraph infra[Инфраструктура]
    NGINX[nginx<br/>reverse proxy<br/>раздача SPA-статики]
  end

  ADMIN  -- HTTPS --> NGINX
  MASTER -- HTTPS --> NGINX
  CLIENT -- HTTPS --> NGINX
  NGINX --> API

  API --> PG
  API --> REDIS
  API --> MINIO
  API <--> BOT
  API -- enqueue --> REDIS
  WORKER -- consume --> REDIS
  WORKER --> PG
  SCHED -- enqueue --> REDIS
```

**Контейнеры:**

| Контейнер | Технология | Назначение |
|---|---|---|
| `admin-app` | Angular 19 SPA, Taiga UI, Tailwind | Веб-интерфейс для OWNER и MANAGER |
| `master-app` | Angular 19 PWA, Taiga UI, Tailwind, Workbox | Веб-интерфейс мастера, offline для нарядов |
| `client-app` | Angular 19 PWA, Taiga UI, Tailwind, Workbox | Веб-интерфейс клиента |
| `api` | NestJS 10, Fastify, MikroORM, BullMQ, Pino | REST API + публикация доменных событий + outbox |
| `telegram-bot` | Telegraf | Telegram-бот студии, единый процесс с `api` (отдельный модуль Nest) |
| `notifications-worker` | NestJS standalone, BullMQ consumer | Обработка очередей уведомлений (email/SMS/push) |
| `scheduler` | NestJS standalone, BullMQ repeatable jobs | Запуск напоминаний, ежедневных дайджестов, обработка outbox |
| `postgres` | PostgreSQL 16 | Реляционная БД: вся бизнес-модель + outbox + audit |
| `redis` | Redis 7 | Очереди BullMQ, кеш, rate-limit (express-rate-limit) |
| `minio` | MinIO | S3-совместимое хранилище: фото «до/после», бэкапы pg_dump |
| `nginx` | nginx 1.27 | Reverse proxy + раздача статики SPA + TLS termination |

> **Решение MVP:** все контейнеры запускаются одной командой `docker-compose up`. На production — те же контейнеры разворачиваются в Yandex Cloud / Selectel через Docker Swarm или Kubernetes (Phase 2).

### 1.3 Component-диаграмма для `api` (C4 Level 3)

```mermaid
flowchart TB
  subgraph api[api — NestJS Application]
    direction TB

    subgraph interfaces[Interfaces Layer]
      HTTP[HTTP Controllers<br/>@Controller, DTO, Swagger]
      WS[WebSocket Gateways<br/>schedule live updates]
      BOT_HANDLERS[Telegram handlers]
      QUEUE[BullMQ producers]
    end

    subgraph application[Application Layer]
      CMD[Command Handlers<br/>@CommandHandler]
      QRY[Query Handlers<br/>@QueryHandler]
      SAGA[Sagas / Process Managers]
      APPSVC[Application Services<br/>orchestration]
      PORTS[Ports<br/>interfaces для infrastructure]
    end

    subgraph domain[Domain Layer]
      AGG[Aggregates<br/>WorkOrder, Appointment, Sku, ...]
      VO[Value Objects]
      DOMSVC[Domain Services]
      EVT[Domain Events]
      REPO_IF[Repository Interfaces]
      POLICIES[Domain Policies]
    end

    subgraph infrastructure[Infrastructure Layer]
      MIKRO[MikroORM<br/>EntityManager + Schemas + Mappers]
      REPO_IMPL[Repository Implementations]
      OUTBOX[Outbox Publisher]
      ADAPTERS[External Adapters<br/>SMS, Email, Telegram, ЮKassa, MinIO]
      CACHE[Redis Cache]
      AUTH_INFRA[Passport strategies + JWT]
    end

    HTTP --> CMD
    HTTP --> QRY
    WS --> CMD
    BOT_HANDLERS --> CMD
    QUEUE --> CMD

    CMD --> AGG
    CMD --> APPSVC
    CMD --> PORTS
    QRY --> CACHE
    QRY --> MIKRO
    SAGA --> CMD
    AGG --> EVT
    AGG --> VO
    AGG --> POLICIES
    AGG --> REPO_IF
    APPSVC --> REPO_IF
    APPSVC --> PORTS

    REPO_IF -.implements.- REPO_IMPL
    PORTS -.implements.- ADAPTERS
    REPO_IMPL --> MIKRO
    OUTBOX --> MIKRO
  end
```

### 1.4 Ключевые архитектурные решения

| ID | Решение | Обоснование | Альтернативы |
|----|---------|-------------|--------------|
| AD-01 | Монолит на NestJS, разделённый на Bounded Contexts через Nest-модули | MVP, малая нагрузка, ускоренная разработка. Микросервисы на старте — преждевременная оптимизация. | Микросервисы — Phase 3 |
| AD-02 | MikroORM как ORM | Реальный Unit of Work, Identity Map, нативная поддержка Data Mapper и DDD-репозиториев. Domain не зависит от ORM (отдельные сущности и схемы). | TypeORM, Prisma — см. ADR-001 |
| AD-03 | CQRS «лёгкий» (без отдельной read-БД) | Команды через `@CommandHandler` (`@nestjs/cqrs`), запросы через специализированные Query Services с прямыми SQL/QueryBuilder. Read-модели — Postgres views и материализованные view (по необходимости). | Event Sourcing — Phase 3, если потребуется |
| AD-04 | In-process domain events с outbox-паттерном | Гарантированная доставка между агрегатами и интеграциями без брокера; будущий перенос в Kafka/RabbitMQ — без изменения domain layer. | Kafka сразу — overhead для MVP |
| AD-05 | REST + OpenAPI | Простота, инструментарий (Swagger UI, codegen для frontend), широкая поддержка. | GraphQL — overkill для CRUD-heavy домена; tRPC — vendor lock-in на Node |
| AD-06 | Один docker-compose для MVP | Требование пользователя; упрощает локальную разработку и пилотный деплой. | Kubernetes — Phase 2 |
| AD-07 | Angular Signals + services, без NgRx и TanStack Query | Минимум зависимостей, нативные средства Angular 19+ (Signals, `resource()`, `httpResource`); упрощает обучение и поддержку. | NgRx Signal Store — избыточно для MVP |
| AD-08 | Telegraf-бот в одном процессе с API | Простота развёртывания, общий доступ к Application Layer. | Отдельный сервис — Phase 2 |
| AD-09 | Outbox для интеграционных событий | Гарантия «atomic publication» вместе с транзакцией БД. | dual-write antipattern — отвергнут |
| AD-10 | PWA только для master и client; admin — обычный SPA | Admin работает за десктопом со стабильной сетью; offline там не нужен и удорожит разработку. | PWA для admin — Phase 2 |

### 1.5 Принципы DDD, которым мы следуем

1. **Ubiquitous Language.** Глоссарий из `product.md` — это словарь кода. Имена классов, методов, событий, таблиц совпадают с терминами глоссария.
2. **Bounded Contexts** изолированы как отдельные Nest-модули, у каждого свои `domain/`, `application/`, `infrastructure/`, `interfaces/`.
3. **Domain не зависит ни от чего.** Domain layer не импортирует ничего из NestJS, MikroORM, axios, dotenv. Только чистый TypeScript + базовые DDD-примитивы (`AggregateRoot`, `Entity`, `ValueObject`, `DomainEvent`).
4. **Aggregate = unit of consistency.** Транзакция не пересекает границы агрегата. Между агрегатами — eventual consistency через доменные события.
5. **Repository per Aggregate Root.** Один репозиторий = один корень. Репозиторий принимает и возвращает агрегат целиком.
6. **Доменные события первичны.** Каждое значимое изменение состояния агрегата выражается событием.
7. **Анти-коррупционный слой (ACL)** между нашими контекстами и внешними системами — обязателен. Внешние модели не текут в domain.
8. **Команды и запросы разделены (CQRS).** Команды меняют состояние, возвращают только идентификаторы. Запросы возвращают DTO read-моделей.

---

## 2. Доменная модель (DDD)

### 2.1 Карта ограниченных контекстов (Context Map)

```mermaid
flowchart LR
  subgraph core[Core Domain]
    SCHED[Scheduling]
    WO[WorkOrder]
    INV[Inventory]
  end

  subgraph supporting[Supporting Domain]
    CRM[CRM]
    CAT[Catalog]
  end

  subgraph generic[Generic Domain]
    IAM[Identity & Access]
    NTF[Notifications]
    BIL[Billing]
  end

  CRM -- Customer/Supplier --> SCHED
  CAT -- Customer/Supplier --> SCHED
  CAT -- Customer/Supplier --> WO
  SCHED -- Partnership --> WO
  WO   -- Customer/Supplier --> INV
  IAM  -- Open Host Service --> SCHED
  IAM  -- Open Host Service --> WO
  IAM  -- Open Host Service --> CRM
  IAM  -- Open Host Service --> CAT
  IAM  -- Open Host Service --> INV
  IAM  -- Open Host Service --> BIL
  WO   -- Domain Events --> NTF
  SCHED -- Domain Events --> NTF
  INV  -- Domain Events --> NTF
  BIL  -- Standalone --> BIL
```

**Типы связей:**

- **Core Domain** (`Scheduling`, `WorkOrder`, `Inventory`): здесь сосредоточена основная бизнес-логика и конкурентное преимущество продукта. Качество кода и тестов здесь — максимальное.
- **Supporting Domain** (`CRM`, `Catalog`): нужны для работы Core, но не уникальны.
- **Generic Domain** (`IAM`, `Notifications`, `Billing`): стандартная функциональность, минимизируем кастомизацию.
- **Customer/Supplier**: upstream-контекст диктует контракт downstream-контексту (с учётом нужд downstream).
- **Partnership**: тесная согласованность между `Scheduling` и `WorkOrder` — это парные контексты с общим жизненным циклом записи и наряда.
- **Open Host Service**: `IAM` предоставляет всем остальным контекстам стандартизованный сервис идентификации и авторизации.

### 2.2 Анти-коррупционный слой (ACL)

Между нашими контекстами и внешними системами:

- **SMS/Email/Telegram/Push** (внешние) ↔ `Notifications` через интерфейс `NotificationDispatcherPort`. Внешние модели не проникают в domain.
- **ЮKassa** ↔ `Billing` через `PaymentProviderPort`.
- **Яндекс ID, Telegram Login** ↔ `IAM` через `OAuthProviderPort`.
- **MinIO** ↔ `WorkOrder` (фото) через `PhotoStoragePort`.

### 2.3 Контекст: Identity & Access (IAM)

#### 2.3.1 Назначение

Аутентификация и авторизация всех типов пользователей: владелец, сотрудники, клиенты. Управление ролями, приглашениями, 2FA, сессиями. Аудит критических действий.

#### 2.3.2 Агрегаты

##### `User` (агрегат)

Корень: `User`.

```ts
// domain/user/user.aggregate.ts
export class User extends AggregateRoot {
  private constructor(
    public readonly id: UserId,
    private _email: Email | null,
    private _phone: PhoneNumber,
    private _passwordHash: PasswordHash | null,
    private _fullName: FullName,
    private _roles: Set<Role>,
    private _branchAccess: Set<BranchId>,
    private _twoFactor: TwoFactorSettings,
    private _status: UserStatus,
    private _createdAt: DateTime,
  ) { super(); }

  static register(props: RegisterUserProps): User { /* invariants */ }
  changeRoles(newRoles: Role[], by: UserId): void { /* OWNER only */ }
  enableTwoFactor(secret: TotpSecret): void {}
  verifyOtp(code: OtpCode): void {}
  deactivate(by: UserId, reason: string): void {}
  // ...
}
```

**Инварианты:**
- В системе всегда есть ≥ 1 активный `OWNER`. Деактивация последнего OWNER запрещена.
- `phone` уникален в рамках инстанса.
- `email` уникален среди активных пользователей.
- `passwordHash` обязателен только для ролей `OWNER`/`MANAGER`/`MASTER` (для `CLIENT` — опционально).
- `branchAccess` обязателен для `MANAGER` и `MASTER`; пустое множество = доступ ко всем филиалам (только для `OWNER`).

**События:**
- `UserRegistered`
- `UserRolesChanged`
- `UserDeactivated`
- `UserTwoFactorEnabled`
- `UserPasswordChanged`

##### `Invitation` (агрегат)

Корень: `Invitation`.

```ts
export class Invitation extends AggregateRoot {
  private constructor(
    public readonly id: InvitationId,
    private _email: Email,
    private _phone: PhoneNumber,
    private _fullName: FullName,
    private _roles: Set<Role>,
    private _branchAccess: Set<BranchId>,
    private _token: InvitationToken,
    private _status: InvitationStatus, // PENDING | ACCEPTED | EXPIRED | REVOKED
    private _expiresAt: DateTime,
    private _invitedBy: UserId,
  ) { super(); }

  static issue(props: IssueInvitationProps): Invitation {}
  accept(by: UserId): void {}
  revoke(by: UserId): void {}
  isExpired(now: DateTime): boolean {}
}
```

**События:**
- `InvitationIssued`
- `InvitationAccepted`
- `InvitationExpired`
- `InvitationRevoked`

##### `Session` (агрегат)

Лёгкий агрегат, в основном для сохранения refresh-токенов и аудита логинов.

##### `OtpCode` (Value Object с TTL и счётчиком попыток, хранится в Redis, не в БД)

#### 2.3.3 Value Objects

`UserId`, `Email`, `PhoneNumber`, `PasswordHash`, `FullName` (firstName + lastName + patronymic?), `Role` (enum: `OWNER` | `MANAGER` | `MASTER` | `CLIENT`), `BranchId`, `OtpCode`, `TotpSecret`, `JwtClaim`.

#### 2.3.4 Domain Services

- `PasswordHashingService` (порт инфраструктуры — bcrypt-адаптер).
- `OtpService` (порт — генерация/валидация OTP, Redis-адаптер).
- `TotpService` (порт — генерация QR + проверка кода).
- `AuthorizationPolicy` (доменный сервис: проверяет, может ли user X выполнить операцию Y над объектом Z).

### 2.4 Контекст: Catalog

#### 2.4.1 Назначение

Каталог услуг с ценообразованием и нормами расхода материалов. Каталог тарифов SaaS (для биллинга-демо).

#### 2.4.2 Агрегаты

##### `Service` (агрегат)

```ts
export class Service extends AggregateRoot {
  private constructor(
    public readonly id: ServiceId,
    private _name: ServiceName,
    private _description: RichText,
    private _categoryId: ServiceCategoryId,
    private _duration: Duration, // в минутах
    private _pricing: ServicePricing, // FixedPricing | ByBodyTypePricing
    private _materialNorms: MaterialNorm[],
    private _isActive: boolean,
    private _displayOrder: number,
    private _priceHistory: PriceHistoryEntry[],
  ) { super(); }

  static create(props: CreateServiceProps): Service {}
  rename(newName: ServiceName, by: UserId): void {}
  changePrice(newPricing: ServicePricing, by: UserId): void {} // публикует ServicePriceChanged
  setDuration(duration: Duration, by: UserId): void {}
  setNorms(norms: MaterialNorm[], by: UserId): void {}
  deactivate(by: UserId): void {}

  calculatePrice(bodyType: BodyType): Money {} // domain method
}
```

**Инварианты:**
- `duration > 0`, кратна 15 минут.
- `pricing` валиден: для `BY_BODY_TYPE` хотя бы одна цена задана.
- `materialNorms` ссылаются на существующие SKU (проверяется на уровне приложения, не доменом).

**События:**
- `ServiceCreated`
- `ServicePriceChanged`
- `ServiceMaterialNormsChanged`
- `ServiceDeactivated`

##### `ServiceCategory` (агрегат, очень простой)

##### `Plan` (агрегат)

Тариф SaaS-подписки. Атрибуты: `name`, `pricePerMonth`, `limits` (число филиалов/мастеров/записей).

#### 2.4.3 Value Objects

`ServiceId`, `ServiceName`, `Duration`, `Money` (amount: Decimal + currency: 'RUB'), `BodyType` (enum), `ServicePricing` (sum type), `MaterialNorm` (skuId + amount + bodyTypeCoefficients), `RichText`.

### 2.5 Контекст: Inventory

#### 2.5.1 Назначение

Учёт материалов: справочник SKU, поставщики, партии, остатки на складе по филиалам, движения (приход/списание/корректировка/перемещение/инвентаризация). Расчёт средневзвешенной себестоимости.

#### 2.5.2 Агрегаты

##### `Sku` (агрегат — справочник)

```ts
export class Sku extends AggregateRoot {
  private constructor(
    public readonly id: SkuId,
    private _articleNumber: ArticleNumber, // уникален
    private _name: SkuName,
    private _group: SkuGroup,
    private _baseUnit: UnitOfMeasure, // ML, G, PCS, M, L, KG
    private _packagings: Packaging[], // канистра 5л = 5000 мл
    private _barcode: Barcode | null,
    private _hasExpiry: boolean,
    private _photoUrl: ImageUrl | null,
    private _isActive: boolean,
    private _description: RichText,
  ) { super(); }

  static create(props: CreateSkuProps): Sku {}
  // ...
}
```

##### `Supplier` (агрегат)

Простой агрегат: контактные данные, реквизиты, статус.

##### `Stock` (агрегат — остаток SKU в конкретном филиале)

> **Решение по границам агрегата.** `Stock` — корень агрегата, объединяющий все партии одного SKU в одном филиале. Это даёт инвариант «текущий остаток = sum(остатки партий) ≥ 0», который сложно поддержать без транзакционной согласованности.

```ts
export class Stock extends AggregateRoot {
  private constructor(
    public readonly id: StockId, // (skuId, branchId)
    public readonly skuId: SkuId,
    public readonly branchId: BranchId,
    private _batches: Batch[],
    private _reorderLevel: Quantity, // минимум для уведомлений
    private _averageCost: Money, // средневзвешенная
  ) { super(); }

  receive(receipt: ReceiptDetails): void {
    // создаём новую Batch, обновляем averageCost, публикуем StockReceived
  }
  consume(amount: Quantity, reason: ConsumptionReason): WriteOffResult {
    // выбираем партии по FEFO/FIFO, уменьшаем остатки
    // если итог < reorderLevel → событие LowStockReached
  }
  adjust(delta: SignedQuantity, reason: string, by: UserId): void {}
  transferOut(amount: Quantity, targetBranch: BranchId): TransferDetails {}
  transferIn(transfer: TransferDetails): void {}

  totalQuantity(): Quantity { return sum(this._batches.map(b => b.remaining)); }
}
```

**Инварианты:**
- `totalQuantity() ≥ 0` всегда (отрицательный остаток запрещён).
- Каждая партия — иммутабельна по `initialQuantity` и `unitCost`; меняется только `remainingQuantity`.
- `averageCost` пересчитывается при каждом приходе.

**События:**
- `StockReceived` (батч добавлен)
- `StockConsumed` (списание на наряд или вручную)
- `StockAdjusted`
- `StockTransferredOut` / `StockTransferredIn`
- `LowStockReached`
- `OutOfStockReached`

##### `Batch` (Entity внутри агрегата `Stock`)

Не корень: всегда модифицируется через `Stock`.

##### `Receipt` (агрегат)

Документ прихода. Содержит позиции, ссылку на накладную поставщика, статус (`DRAFT` → `POSTED` → `CANCELLED`).

##### `Adjustment` (агрегат)

Документ корректировки. Может требовать утверждения OWNER если сумма > порога.

##### `Transfer` (агрегат)

Документ перемещения между филиалами. Парные движения.

##### `StockTaking` (агрегат)

Документ инвентаризации. Содержит фактические замеры по SKU, проводит массовую корректировку.

#### 2.5.3 Value Objects

`SkuId`, `ArticleNumber`, `SkuName`, `SkuGroup`, `UnitOfMeasure`, `Quantity` (amount + unit), `SignedQuantity`, `Packaging`, `Barcode`, `Money`, `BatchId`, `BranchId`, `ConsumptionReason` (sum type: `WorkOrder` | `Manual` | `Sample` | ...).

#### 2.5.4 Domain Services

- `BatchSelectionService` — реализует FEFO/FIFO выбор партий для списания.
- `AverageCostCalculator` — пересчёт средневзвешенной себестоимости при приходе.

### 2.6 Контекст: CRM

#### 2.6.1 Назначение

Клиенты студии и их автомобили. Согласия 152-ФЗ. История посещений (read-проекция из других контекстов).

#### 2.6.2 Агрегаты

##### `Client` (агрегат)

```ts
export class Client extends AggregateRoot {
  private constructor(
    public readonly id: ClientId,
    private _fullName: FullName,
    private _phone: PhoneNumber,
    private _email: Email | null,
    private _birthDate: Date | null,
    private _source: ClientSource | null,
    private _consents: ConsentSet,
    private _type: ClientType, // REGULAR | GUEST
    private _segments: Set<SegmentId>,
    private _comment: string,
    private _vehicles: Vehicle[],
    private _status: ClientStatus, // ACTIVE | ANONYMIZED | DELETED
  ) { super(); }

  static registerRegular(props): Client {}
  static registerGuest(props): Client {}
  upgradeToRegular(password: PasswordHash): void {}

  addVehicle(props: AddVehicleProps): VehicleId {}
  updateVehicle(id, props): void {}
  deactivateVehicle(id): void {}

  giveConsent(type: ConsentType, at: DateTime): void {}
  revokeConsent(type: ConsentType, at: DateTime): void {}

  anonymize(by: UserId, reason: string): void {} // 152-ФЗ
}
```

**Инварианты:**
- Клиент имеет минимум одно согласие — `PERSONAL_DATA_PROCESSING`.
- Анонимизированный клиент не может быть обновлён, новые записи на него запрещены.

**События:**
- `ClientRegistered` (с типом REGULAR/GUEST)
- `ClientUpgradedToRegular`
- `ClientVehicleAdded`
- `ClientConsentGiven` / `ClientConsentRevoked`
- `ClientAnonymized`

##### `Vehicle` — Entity внутри `Client` (не корень)

#### 2.6.3 Value Objects

`ClientId`, `FullName`, `PhoneNumber`, `Email`, `ClientSource`, `ConsentSet` (с типами и датами), `VehicleId`, `Make`, `Model`, `BodyType`, `LicensePlate`, `Vin`, `VehicleColor`.

### 2.7 Контекст: Scheduling

#### 2.7.1 Назначение

Графики работы филиалов и мастеров; расчёт доступных слотов; управление записями (создание, перенос, отмена, окно отмены).

#### 2.7.2 Агрегаты

##### `BranchSchedule` (агрегат)

Расписание филиала: дни недели, часы открытия/закрытия, перерывы, исключения (праздники, особые дни).

##### `MasterSchedule` (агрегат)

Расписание мастера: дни/часы работы, отпуска, отгулы.

##### `Appointment` (агрегат)

```ts
export class Appointment extends AggregateRoot {
  private constructor(
    public readonly id: AppointmentId,
    private _clientId: ClientId,
    private _vehicleId: VehicleId,
    private _branchId: BranchId,
    private _bayId: BayId | null,
    private _masterId: MasterId,
    private _services: AppointmentService[], // [{serviceId, durationCopy, priceCopy}]
    private _slot: TimeSlot, // start, end, timezone
    private _status: AppointmentStatus,
    private _cancellationRequest: CancellationRequest | null,
    private _createdBy: UserId,
    private _createdVia: CreationChannel, // ONLINE | MANAGER | GUEST
  ) { super(); }

  static create(props: CreateAppointmentProps): Appointment {}
  confirm(by: UserId): void {}
  reschedule(newSlot: TimeSlot, by: UserId): void {}
  cancel(by: UserId, reason: string): void {}
  requestCancellation(reason: string): void {} // если <24ч
  approveCancellation(by: UserId): void {}
  rejectCancellation(by: UserId, reason: string): void {}
  startWork(): WorkOrderId {} // → IN_PROGRESS, триггер создания WorkOrder
  complete(): void {} // ← из WorkOrder при закрытии
  markNoShow(by: UserId): void {}
}
```

**Инварианты:**
- `slot.duration ≥ sum(services.duration)` (с учётом буфера 0).
- `slot` не выходит за рабочие часы филиала и мастера.
- В рамках одного мастера слоты не пересекаются (проверяется в момент бронирования, защита от race-condition — оптимистичная блокировка по `MasterSchedule`).
- Переход статусов: только разрешённые (state machine).

**Состояния:**

```
                              ┌→ NO_SHOW
PENDING_CONFIRMATION → CONFIRMED → IN_PROGRESS → COMPLETED
        ↓                ↓                          
   CANCELLED         CANCELLED                       
```

**События:**
- `AppointmentCreated`
- `AppointmentConfirmed`
- `AppointmentRescheduled`
- `AppointmentCancelled`
- `AppointmentCancellationRequested`
- `AppointmentCancellationApproved` / `Rejected`
- `AppointmentStarted` (→ создание WorkOrder)
- `AppointmentCompleted`
- `AppointmentMarkedNoShow`

##### `Slot` (Value Object) и `SlotAvailability` (read-model)

#### 2.7.3 Domain Services

- `AvailabilityCalculator` — расчёт свободных слотов по запросу клиента (используется в Query). Чистый алгоритм над BranchSchedule + MasterSchedule + существующими Appointments.
- `CancellationPolicy` — определяет, может ли клиент отменить самостоятельно (≥24ч) или требуется согласование.

### 2.8 Контекст: WorkOrder

#### 2.8.1 Назначение

Документ выполнения услуги: приём авто, фото «до/после», фактический расход материалов, расхождение нормы, закрытие наряда. Триггерит списание из `Inventory`.

#### 2.8.2 Агрегаты

##### `WorkOrder` (агрегат)

```ts
export class WorkOrder extends AggregateRoot {
  private constructor(
    public readonly id: WorkOrderId,
    public readonly appointmentId: AppointmentId,
    private _branchId: BranchId,
    private _masterId: MasterId,
    private _clientId: ClientId,
    private _vehicleId: VehicleId,
    private _services: WorkOrderService[],
    private _normsSnapshot: MaterialNormSnapshot[], // копия норм на момент создания
    private _actualConsumption: ConsumptionLine[],
    private _photosBefore: PhotoRef[],
    private _photosAfter: PhotoRef[],
    private _status: WorkOrderStatus,
    private _openedAt: DateTime,
    private _closedAt: DateTime | null,
    private _cancellationReason: string | null,
  ) { super(); }

  static openFromAppointment(appointment: Appointment, norms: MaterialNorm[]): WorkOrder {}

  addPhotoBefore(photo: PhotoRef): void {}
  addPhotoAfter(photo: PhotoRef): void {}
  removePhoto(photoId: PhotoId): void {}

  addConsumption(line: ConsumptionLineDraft): void {}
  updateConsumption(lineId: LineId, props): void {}
  removeConsumption(lineId: LineId): void {}

  close(): WorkOrderClosingResult {
    // Инварианты:
    //  - photosBefore.length >= 1
    //  - photosAfter.length >= 1
    //  - все строки расхода имеют комментарий, если |отклонение| > 15%
    // События:
    //  - WorkOrderClosed
    //  - StockConsumptionRequested (для каждой строки → Inventory)
  }
  cancel(reason: string, by: UserId): void {}

  reopen(by: UserId, reason: string): void {} // только OWNER/MANAGER
}
```

**Инварианты:**
- Для перехода в `CLOSED` обязательны фото «до/после» (≥ 1).
- Для строки расхода с |фактическое − норма| / норма > 0.15 обязателен `deviationReason`.
- Закрытие наряда блокируется, если в `Stock` недостаточно остатков для списания.

**События:**
- `WorkOrderOpened`
- `WorkOrderPhotoAdded` / `Removed`
- `WorkOrderConsumptionAdded` / `Updated` / `Removed`
- `WorkOrderClosed` (содержит сводку списания → потребляется `Notifications` и `Inventory`)
- `WorkOrderCancelled`
- `WorkOrderReopened`

##### `ConsumptionLine` (Entity внутри WorkOrder)

Атрибуты: `skuId`, `actualAmount`, `normAmount`, `deviationReason`, `comment`.

#### 2.8.3 Domain Services

- `NormDeviationCalculator` — определяет, превышает ли расхождение порог.
- `ClosingValidator` — собирает все нарушения инвариантов перед закрытием.

### 2.9 Контекст: Notifications

#### 2.9.1 Назначение

Доставка уведомлений по каналам (email, SMS, Telegram, push). Шаблоны, подписки пользователей, очередь, retry, dedup.

#### 2.9.2 Агрегаты

##### `NotificationTemplate` (агрегат)

Параметризованный шаблон с языком (RU), каналами, текстом.

##### `UserNotificationPreferences` (агрегат)

Настройки конкретного пользователя по каждому шаблону: какие каналы включены, тихие часы.

##### `Notification` (агрегат — экземпляр доставки)

```ts
export class Notification extends AggregateRoot {
  private constructor(
    public readonly id: NotificationId,
    private _recipient: RecipientRef, // userId | phone | email
    private _templateCode: TemplateCode,
    private _channel: NotificationChannel,
    private _payload: TemplatePayload, // params для рендера
    private _status: NotificationStatus, // PENDING | SENDING | SENT | FAILED | DEDUPED
    private _attempts: number,
    private _lastError: string | null,
    private _createdAt: DateTime,
    private _sentAt: DateTime | null,
  ) { super(); }
}
```

#### 2.9.3 Domain Services

- `NotificationDispatcherPort` (порт) — реализуется адаптерами SMS/Email/Telegram/Push.
- `DeduplicationService` — для `LOW_STOCK`, `APPOINTMENT_REMINDER` (одно уведомление на ключ в окне времени).

### 2.10 Контекст: Billing (демо)

#### 2.10.1 Назначение

Управление подпиской студии, имитация оплаты, лимиты тарифа (предупреждения).

#### 2.10.2 Агрегаты

##### `Subscription` (агрегат)

`planId`, `status` (`TRIAL` | `ACTIVE` | `PAST_DUE` | `CANCELLED`), `nextBillingDate`, `history`.

##### `Invoice` (агрегат)

История списаний (демо: генерируются автоматически).

#### 2.10.3 Доменные политики

- `LimitPolicy` — проверяет, превышены ли лимиты тарифа (используется как warning, не блокирует).

### 2.11 Сводная карта доменных событий и их потребителей

| Событие | Источник | Потребители |
|---|---|---|
| `UserRegistered` | IAM | Notifications (приветственное email) |
| `InvitationIssued` | IAM | Notifications (отправить пригласительную ссылку) |
| `ServicePriceChanged` | Catalog | (audit) |
| `StockReceived` | Inventory | (audit) |
| `LowStockReached` | Inventory | Notifications |
| `OutOfStockReached` | Inventory | Notifications, WorkOrder (предотвратить закрытие) |
| `AppointmentCreated` | Scheduling | Notifications |
| `AppointmentConfirmed` | Scheduling | Notifications |
| `AppointmentCancelled` | Scheduling | Notifications |
| `AppointmentCancellationRequested` | Scheduling | Notifications (менеджеру) |
| `AppointmentStarted` | Scheduling | WorkOrder (создать наряд) |
| `WorkOrderOpened` | WorkOrder | (внутри контекста) |
| `WorkOrderClosed` | WorkOrder | Inventory (списание), Scheduling (Appointment.complete), Notifications (клиенту) |
| `WorkOrderCancelled` | WorkOrder | Scheduling (отменить запись) |
| `ClientAnonymized` | CRM | (audit) |

### 2.12 Saga / Process Manager: «Закрытие наряда»

```mermaid
sequenceDiagram
  participant M as Master
  participant WO as WorkOrder.close()
  participant SAGA as CloseWorkOrderSaga
  participant INV as Inventory
  participant SCH as Scheduling
  participant NTF as Notifications

  M->>WO: closeWorkOrder
  WO->>WO: validate invariants
  WO->>WO: emit WorkOrderClosed (outbox)
  
  SAGA->>SAGA: handle WorkOrderClosed
  SAGA->>INV: ConsumeStockCommand (per line)
  alt все строки списаны
    INV-->>SAGA: StockConsumed events
    SAGA->>SCH: CompleteAppointmentCommand
    SCH-->>SAGA: AppointmentCompleted
    SAGA->>NTF: SendWorkOrderCompletedNotification
  else недостаточно остатка
    INV-->>SAGA: InsufficientStockError
    SAGA->>WO: ReopenWorkOrderCommand (compensation)
    SAGA->>NTF: NotifyMasterError
  end
```

**Решение:** при недостатке остатков (что в нормальной ситуации не должно происходить — мастер должен был это увидеть в UI до закрытия) сага компенсирует закрытие наряда: переоткрывает его и уведомляет мастера. Это даёт строгую согласованность между WorkOrder и Inventory.

---

## 3. Прикладной слой (CQRS)

### 3.1 Подход

- **Команды** — изменяют состояние, идут через `@CommandHandler`. Возвращают только идентификаторы (или ничего).
- **Запросы** — читают данные, идут через `@QueryHandler`. Возвращают DTO/ViewModel.
- **События** — публикуются агрегатами при изменении состояния. Обрабатываются `@EventHandler` внутри домена и через outbox — в integration handlers.
- Используется библиотека `@nestjs/cqrs` (CommandBus / QueryBus / EventBus / Saga).

**Транзакционные границы:**

- 1 команда = 1 транзакция БД = 1 агрегат (загружаем + меняем + сохраняем + outbox-записи).
- Между агрегатами — eventually consistent через outbox + event handlers.

### 3.2 Шаблон обработчика команды

```ts
@CommandHandler(CreateAppointmentCommand)
export class CreateAppointmentHandler implements ICommandHandler<CreateAppointmentCommand, AppointmentId> {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: IAppointmentRepository,
    @Inject(MASTER_SCHEDULE_REPOSITORY) private readonly masterSchedules: IMasterScheduleRepository,
    @Inject(SERVICE_QUERY_PORT) private readonly serviceQuery: IServiceQueryPort, // ACL к Catalog
    @Inject(CLIENT_QUERY_PORT) private readonly clientQuery: IClientQueryPort,    // ACL к CRM
    private readonly uow: UnitOfWork,
  ) {}

  async execute(cmd: CreateAppointmentCommand): Promise<AppointmentId> {
    return this.uow.run(async () => {
      const services = await this.serviceQuery.findActiveByIds(cmd.serviceIds);
      const client = await this.clientQuery.findById(cmd.clientId);
      const masterSchedule = await this.masterSchedules.findByMasterAndDate(cmd.masterId, cmd.slot.date);

      const appointment = Appointment.create({
        client,
        services,
        masterSchedule,
        slot: TimeSlot.fromInput(cmd.slot),
        createdBy: cmd.actorId,
        createdVia: cmd.createdVia,
      });

      await this.appointments.save(appointment);
      // публикация AppointmentCreated через AggregateRoot.commit() в outbox
      return appointment.id;
    });
  }
}
```

### 3.3 Список команд и запросов по контекстам

#### 3.3.1 IAM

**Commands:**
- `RegisterOwnerCommand` (CLI/first-run)
- `IssueInvitationCommand`
- `AcceptInvitationCommand`
- `RevokeInvitationCommand`
- `LoginWithPasswordCommand`
- `LoginWithOtpCommand`
- `LoginWithOAuthCommand` (Яндекс / Telegram)
- `RefreshSessionCommand`
- `LogoutCommand`
- `ChangePasswordCommand`
- `ResetPasswordRequestCommand`
- `ResetPasswordConfirmCommand`
- `EnableTwoFactorCommand` / `DisableTwoFactorCommand`
- `VerifyTwoFactorCommand`
- `ChangeUserRolesCommand`
- `DeactivateUserCommand`
- `RecordAuditEventCommand`

**Queries:**
- `GetCurrentUserQuery`
- `ListStaffQuery`
- `GetUserByIdQuery`
- `ListInvitationsQuery`
- `ListAuditLogQuery`

#### 3.3.2 Catalog

**Commands:**
- `CreateServiceCategoryCommand` / Update / Deactivate
- `CreateServiceCommand`
- `UpdateServiceCommand`
- `ChangeServicePriceCommand`
- `SetServiceMaterialNormsCommand`
- `DeactivateServiceCommand`
- `CreatePlanCommand` (admin для биллинга-демо)

**Queries:**
- `ListServicesQuery` (с фильтрами: категория, активность)
- `GetServiceByIdQuery`
- `ListServiceCategoriesQuery`
- `GetClientServiceCatalogQuery` (read-модель для client-app: только активные, без норм)
- `GetServicePriceHistoryQuery`
- `ListPlansQuery`

#### 3.3.3 Inventory

**Commands:**
- `CreateSkuCommand` / `UpdateSkuCommand` / `DeactivateSkuCommand`
- `CreateSupplierCommand` / Update / Deactivate
- `CreateReceiptCommand`
- `PostReceiptCommand` (проводка)
- `CancelReceiptCommand` (если возможно)
- `CreateAdjustmentCommand`
- `ApproveAdjustmentCommand` (OWNER)
- `RejectAdjustmentCommand`
- `CreateTransferCommand`
- `PostTransferCommand`
- `StartStockTakingCommand`
- `RecordStockTakingMeasurementCommand` (фактическое количество)
- `PostStockTakingCommand`
- `CancelStockTakingCommand`
- `ConsumeStockCommand` (вызывается из WorkOrder Saga)
- `SetReorderLevelCommand`

**Queries:**
- `ListSkusQuery`
- `GetSkuByIdQuery`
- `ListSuppliersQuery`
- `ListReceiptsQuery` / `GetReceiptByIdQuery`
- `ListAdjustmentsQuery`
- `ListMovementsQuery` (журнал движений)
- `GetStockOnDateQuery` (отчёт на дату)
- `GetLowStockReportQuery`
- `GetStockByBranchQuery`
- `ListPendingApprovalsQuery` (для OWNER)
- `ListStockTakingsQuery` / `GetStockTakingByIdQuery`

#### 3.3.4 CRM

**Commands:**
- `RegisterRegularClientCommand`
- `RegisterGuestClientCommand`
- `UpgradeClientToRegularCommand`
- `UpdateClientProfileCommand`
- `AddVehicleCommand`
- `UpdateVehicleCommand`
- `DeactivateVehicleCommand`
- `GiveConsentCommand`
- `RevokeConsentCommand`
- `RequestClientDataExportCommand` (152-ФЗ)
- `RequestClientAnonymizationCommand`
- `AnonymizeClientCommand` (выполняется OWNER)

**Queries:**
- `ListClientsQuery`
- `GetClientByIdQuery`
- `GetClientByPhoneQuery`
- `GetClientVehiclesQuery`
- `GetClientVisitHistoryQuery` (read-проекция из Scheduling+WorkOrder)

#### 3.3.5 Scheduling

**Commands:**
- `CreateBranchCommand` / `UpdateBranchCommand` / `DeactivateBranchCommand`
- `SetBranchScheduleCommand`
- `SetMasterScheduleCommand`
- `CreateBayCommand`
- `CreateAppointmentCommand` (от клиента или менеджера)
- `ConfirmAppointmentCommand`
- `RescheduleAppointmentCommand`
- `CancelAppointmentCommand`
- `RequestAppointmentCancellationCommand`
- `ApproveCancellationCommand`
- `RejectCancellationCommand`
- `MarkAppointmentNoShowCommand`
- `StartWorkCommand` (вызывает создание WorkOrder)
- `CompleteAppointmentCommand` (из WorkOrder Saga)

**Queries:**
- `ListAppointmentsQuery` (с фильтрами: branch, master, date range, status)
- `GetAppointmentByIdQuery`
- `GetAvailableSlotsQuery` (для онлайн-записи)
- `GetMasterScheduleQuery`
- `GetBranchScheduleQuery`
- `GetTodayAppointmentsForMasterQuery`

#### 3.3.6 WorkOrder

**Commands:**
- `OpenWorkOrderCommand` (внутренняя, из Saga)
- `AddBeforePhotoCommand`
- `AddAfterPhotoCommand`
- `RemovePhotoCommand`
- `AddConsumptionLineCommand`
- `UpdateConsumptionLineCommand`
- `RemoveConsumptionLineCommand`
- `CloseWorkOrderCommand`
- `CancelWorkOrderCommand`
- `ReopenWorkOrderCommand` (OWNER/MANAGER)

**Queries:**
- `ListWorkOrdersQuery`
- `GetWorkOrderByIdQuery`
- `GetWorkOrderByAppointmentQuery`
- `GetMyWorkOrdersQuery` (для мастера)
- `GetClientWorkOrdersQuery` (для клиента)
- `GetNormDeviationReportQuery` (отчёт расхождений)

#### 3.3.7 Notifications

**Commands:**
- `EnqueueNotificationCommand`
- `MarkNotificationSentCommand` (от worker'а)
- `MarkNotificationFailedCommand`
- `UpdateUserPreferencesCommand`

**Queries:**
- `ListUserNotificationsQuery`
- `GetTemplateByCodeQuery`
- `GetUserPreferencesQuery`
- `GetFailedNotificationsQuery` (DLQ)

#### 3.3.8 Billing (demo)

**Commands:**
- `ChangePlanCommand`
- `GenerateMonthlyInvoiceCommand` (scheduler)
- `MarkInvoicePaidCommand` (демо)

**Queries:**
- `GetCurrentSubscriptionQuery`
- `ListInvoicesQuery`
- `GetTariffLimitsUsageQuery` (для warning)

### 3.4 Read-модели и проекции

В MVP используется CQRS-light: read-модели реализуются как **Query Services**, которые читают напрямую из тех же таблиц через MikroORM QueryBuilder или нативный SQL. Это упрощает разработку и не требует отдельных таблиц-проекций.

Где это действительно нужно — используются **PostgreSQL views** (для отчётов) и **materialized views** (для тяжёлых отчётов с обновлением раз в N минут — например, `mv_revenue_by_service`, `mv_norm_deviations_30d`).

Если в Phase 2 потребуется отдельная read-БД (например, ClickHouse для аналитики) — переход bezболезненный: интерфейс Query Service не меняется, меняется только реализация.

### 3.5 Обработка событий

#### 3.5.1 In-process event handlers (синхронно)

Используются для обновления read-моделей и кросс-агрегатных операций внутри одного контекста.

```ts
@EventsHandler(WorkOrderClosed)
export class UpdateAppointmentOnWorkOrderClosed implements IEventHandler<WorkOrderClosed> {
  constructor(private readonly commandBus: CommandBus) {}
  async handle(event: WorkOrderClosed): Promise<void> {
    await this.commandBus.execute(new CompleteAppointmentCommand(event.appointmentId));
  }
}
```

#### 3.5.2 Outbox для интеграционных событий (асинхронно, гарантированная доставка)

```mermaid
sequenceDiagram
  participant CMD as Command Handler
  participant TX as DB Transaction
  participant AGG as Aggregate
  participant OB as outbox table
  participant POL as Outbox Poller
  participant Q as BullMQ
  participant W as Worker

  CMD->>TX: BEGIN
  CMD->>AGG: aggregate.doSomething()
  AGG-->>AGG: emit DomainEvent
  CMD->>TX: persist aggregate
  CMD->>OB: insert outbox row (event payload)
  CMD->>TX: COMMIT
  
  POL->>OB: SELECT unpublished
  POL->>Q: enqueue
  POL->>OB: UPDATE published_at
  
  W->>Q: consume
  W->>W: handle (send SMS / call ЮKassa / etc)
```

**Outbox table schema:**
```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL
);
CREATE INDEX idx_outbox_unpublished ON outbox_events (occurred_at) WHERE published_at IS NULL;
```

Outbox Poller — отдельный BullMQ repeating job, тикает каждые 1 секунду.

### 3.6 Транзакции и Unit of Work

MikroORM предоставляет `EntityManager.fork()` с собственным Identity Map на запрос. Используется паттерн «UnitOfWork-per-request»:

```ts
// infrastructure/persistence/mikro-uow.ts
@Injectable()
export class MikroUnitOfWork implements UnitOfWork {
  constructor(private readonly orm: MikroORM) {}

  async run<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
    const em = this.orm.em.fork({ useContext: true });
    return em.transactional(async (txEm) => {
      const result = await work(txEm);
      // EM.flush() выполняется автоматически в transactional
      return result;
    });
  }
}
```

В Nest CommandHandler EM получается через `RequestContext` MikroORM (middleware пробрасывает контекст на запрос).

---

## 4. REST API

### 4.1 Общие принципы

- **Базовый URL:** `https://<host>/api/v1`.
- **Аутентификация:** Bearer JWT в заголовке `Authorization: Bearer <token>`. Refresh — через httpOnly cookie + endpoint `POST /auth/refresh`.
- **Content-Type:** `application/json` (UTF-8). Загрузка файлов — `multipart/form-data`.
- **Идемпотентность:** для критических POST (создание заказа, оплата) принимается заголовок `Idempotency-Key`.
- **Пагинация:** offset-based через `DynamicQueryDto` (`?page=1&pageSize=25`). Ответ — `PaginatedResponseDto<T>` (items, totalCount, totalPages, page, pageSize).
- **Сортировка:** `?sorts=<field>,-<field>` (`-` = desc). Пример: `?sorts=-createdAt,client.name`.
- **Фильтрация:** через `DynamicQuery` DSL в параметре `?filters=`. Операторы: `==`, `!=`, `>`, `<`, `>=`, `<=`, `@=` (contains), `_=` (starts with), `^=` (ends with), `!@=` (not contains), `*=` (in), `!*=` (not in). AND через `,`, OR через `|`. Пример: `?filters=status*=ACTIVE,PENDING|client.name@=Иван`. Подробности — § 6.10.
- **Ошибки:** RFC 7807 Problem Details:
  ```json
  {
    "type": "https://docs.detailing.example/errors/insufficient-stock",
    "title": "Недостаточно остатка",
    "status": 422,
    "detail": "На складе филиала «Главный» остаток SKU «Полироль X» составляет 30 мл, требуется 65 мл",
    "instance": "/api/v1/work-orders/uuid/consumption",
    "code": "INSUFFICIENT_STOCK",
    "fields": { "skuId": "...", "branchId": "...", "available": 30, "requested": 65 }
  }
  ```
- **Коды ошибок:**
  - `400` — валидация DTO.
  - `401` — нет токена / истёк.
  - `403` — недостаточно прав (RBAC).
  - `404` — ресурс не найден.
  - `409` — конфликт (например, race на слоте).
  - `422` — нарушение бизнес-инварианта (доменная ошибка).
  - `429` — rate limit.
  - `500` — необработанная.

### 4.2 Версионирование

- Через URL prefix `/api/v1/`.
- Breaking changes → новая мажорная версия `/api/v2/`. Старая поддерживается 6 месяцев параллельно.
- Non-breaking (новые поля) — без смены версии.

### 4.3 Swagger / OpenAPI

- Документация генерируется автоматически из NestJS DTO + декораторов `@ApiProperty`, `@ApiResponse`.
- UI на `https://<host>/api/docs` (под флагом, выключен в production по умолчанию).
- OpenAPI JSON-спецификация публикуется на `/api/openapi.json` и используется фронтендом для генерации типов через `openapi-typescript` (опц.).

### 4.4 Структура endpoints по контекстам

> Полная спецификация — в OpenAPI. Здесь — базовая taxonomy.

#### IAM

```
POST   /auth/login/password
POST   /auth/login/otp/request
POST   /auth/login/otp/verify
POST   /auth/login/oauth/yandex
POST   /auth/login/oauth/telegram
POST   /auth/refresh
POST   /auth/logout
POST   /auth/password/reset/request
POST   /auth/password/reset/confirm
POST   /auth/2fa/enable
POST   /auth/2fa/verify
DELETE /auth/2fa
GET    /me
PATCH  /me
GET    /staff
POST   /staff/invitations
GET    /staff/invitations
DELETE /staff/invitations/:id
POST   /staff/invitations/:token/accept
PATCH  /staff/:id/roles
POST   /staff/:id/deactivate
GET    /audit-log
```

#### Catalog

```
GET    /service-categories
POST   /service-categories
PATCH  /service-categories/:id
DELETE /service-categories/:id

GET    /services
GET    /services/public                 # для client-app, без норм
POST   /services
GET    /services/:id
PATCH  /services/:id
PATCH  /services/:id/price
PATCH  /services/:id/material-norms
DELETE /services/:id
GET    /services/:id/price-history

GET    /plans                            # SaaS-тарифы
```

#### Inventory

```
GET    /skus
POST   /skus
GET    /skus/:id
PATCH  /skus/:id
DELETE /skus/:id
GET    /skus/by-barcode?value=...

GET    /suppliers
POST   /suppliers
GET    /suppliers/:id
PATCH  /suppliers/:id

GET    /receipts
POST   /receipts                         # создаёт DRAFT
GET    /receipts/:id
PATCH  /receipts/:id                     # только если DRAFT
POST   /receipts/:id/post                # проводка
POST   /receipts/:id/cancel
POST   /receipts/:id/attachments         # файл накладной

GET    /adjustments
POST   /adjustments
GET    /adjustments/:id
POST   /adjustments/:id/approve          # OWNER
POST   /adjustments/:id/reject

GET    /transfers
POST   /transfers
POST   /transfers/:id/post

GET    /stock-takings
POST   /stock-takings
GET    /stock-takings/:id
PATCH  /stock-takings/:id/measurements   # ввод фактических количеств
POST   /stock-takings/:id/post
POST   /stock-takings/:id/cancel
GET    /stock-takings/:id/sheet.pdf      # инвентаризационная ведомость

GET    /stock                            # текущие остатки (с фильтрами)
GET    /stock/by-branch/:branchId
GET    /stock/low                        # отчёт «низкие остатки»
GET    /stock/movements                  # журнал движений
GET    /stock/on-date?date=...           # отчёт «остатки на дату»
```

#### CRM

```
GET    /clients
POST   /clients
GET    /clients/:id
PATCH  /clients/:id
POST   /clients/:id/anonymize            # OWNER, 152-ФЗ
GET    /clients/:id/data-export          # 152-ФЗ
GET    /clients/:id/visit-history

POST   /clients/:id/vehicles
PATCH  /clients/:id/vehicles/:vehicleId
DELETE /clients/:id/vehicles/:vehicleId

POST   /clients/:id/consents
DELETE /clients/:id/consents/:type
```

#### Scheduling

```
GET    /branches
POST   /branches
GET    /branches/:id
PATCH  /branches/:id
GET    /branches/:id/schedule
PUT    /branches/:id/schedule

GET    /branches/:id/bays
POST   /branches/:id/bays
PATCH  /bays/:id

GET    /masters/:id/schedule
PUT    /masters/:id/schedule

GET    /appointments                     # с фильтрами
GET    /appointments/today               # для master-app
POST   /appointments                     # от менеджера или клиента
GET    /appointments/:id
POST   /appointments/:id/confirm
POST   /appointments/:id/reschedule
POST   /appointments/:id/cancel
POST   /appointments/:id/cancellation-request   # клиентом, <24ч
POST   /appointments/:id/cancellation-request/approve
POST   /appointments/:id/cancellation-request/reject
POST   /appointments/:id/start           # → IN_PROGRESS, создание WorkOrder
POST   /appointments/:id/no-show

GET    /availability                     # GET /availability?branch=...&services=...&masterId=optional&from=...&to=...
```

#### WorkOrder

```
GET    /work-orders
GET    /work-orders/:id
GET    /work-orders/by-appointment/:appointmentId
GET    /work-orders/my                   # для мастера
POST   /work-orders/:id/photos/before    # multipart upload
POST   /work-orders/:id/photos/after
DELETE /work-orders/:id/photos/:photoId

POST   /work-orders/:id/consumption
PATCH  /work-orders/:id/consumption/:lineId
DELETE /work-orders/:id/consumption/:lineId

POST   /work-orders/:id/close
POST   /work-orders/:id/cancel
POST   /work-orders/:id/reopen           # OWNER/MANAGER
```

#### Notifications

```
GET    /me/notifications                 # список своих уведомлений
GET    /me/notifications/preferences
PUT    /me/notifications/preferences
POST   /me/push-subscriptions            # PWA Web Push
DELETE /me/push-subscriptions/:id

GET    /admin/notifications              # OWNER/MANAGER, мониторинг
GET    /admin/notifications/failed       # DLQ
POST   /admin/notifications/:id/retry

GET    /unsubscribe?token=...            # из email-ссылки
```

#### Billing (demo)

```
GET    /subscription
POST   /subscription/change-plan
GET    /subscription/invoices
POST   /subscription/invoices/:id/pay    # заглушка
```

#### Reports

```
GET    /reports/stock-on-date?date=...&branch=...
GET    /reports/movements?from=...&to=...&skuId=...
GET    /reports/revenue-by-service?from=...&to=...
GET    /reports/revenue-by-master?from=...&to=...
GET    /reports/low-stock
GET    /reports/norm-deviations?from=...&to=...&masterId=optional
```

### 4.5 Аутентификация (детально)

#### 4.5.1 Login flow с паролем

```
POST /auth/login/password
{ "email": "user@example.com", "password": "..." }

→ 200 OK
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
{
  "accessToken": "eyJ...",
  "expiresIn": 900,
  "user": { "id": "...", "fullName": "...", "roles": [...] }
}
```

#### 4.5.2 Login flow с OTP (для клиентов и сотрудников)

```
POST /auth/login/otp/request
{ "phone": "+79991234567" }
→ 204 No Content (always 204, чтобы не разглашать существование пользователя)

POST /auth/login/otp/verify
{ "phone": "+79991234567", "code": "123456" }
→ 200 OK + same response as password login
```

#### 4.5.3 Refresh

```
POST /auth/refresh
Cookie: refreshToken=...
→ 200 OK + новый access + ротация refresh-cookie
```

#### 4.5.4 OAuth (Яндекс ID)

```
1. Frontend получает authorization_code через Яндекс OAuth.
2. POST /auth/login/oauth/yandex
   { "code": "...", "redirectUri": "..." }
3. Backend обменивает code → access_token, получает профиль, ищет/создаёт User.
4. Возвращает наш JWT.
```

### 4.6 Загрузка файлов

```
POST /work-orders/:id/photos/before
Content-Type: multipart/form-data

→ 201 Created
{ "photoId": "...", "url": "https://minio.example/photos/...", "thumbnailUrl": "..." }
```

- Прямая загрузка через API (не presigned URL в MVP — упрощает контроль).
- На бэке: проверка типа (magic bytes), сжатие (sharp), генерация thumbnail (200×200), upload в MinIO.
- Хранение URL в `WorkOrder.photosBefore[]` как `PhotoRef { id, url, thumbnailUrl, mime, sizeBytes, uploadedBy, uploadedAt }`.

### 4.7 WebSocket

WS используется только для live-обновлений расписания в admin-приложении:

```
WS /ws/schedule?branchId=...
→ events:
  { type: "appointmentCreated", payload: {...} }
  { type: "appointmentRescheduled", payload: {...} }
  { type: "appointmentCancelled", payload: {...} }
  { type: "workOrderOpened", payload: {...} }
  { type: "workOrderClosed", payload: {...} }
```

Подписка авторизуется по JWT. Realtime реализован через `@nestjs/websockets` + Socket.IO.

В client-app и master-app realtime не нужен — короткий polling доступных слотов на 30 секунд при просмотре + рефреш при действиях.

### 4.8 Идемпотентность

Для команд с побочными эффектами (создание записи, оплата, отправка уведомления вручную) принимается заголовок `Idempotency-Key`. Бэкенд хранит маппинг key → response в Redis на 24 часа; повторный запрос возвращает закешированный результат.

---

## 5. Модель данных (persistence)

### 5.1 Принципы

- **Доменная модель ≠ persistence-модель.** Доменные классы (`Appointment`, `Sku`, `WorkOrder`) живут в `domain/`. Persistence-схемы (`AppointmentSchema`) — в `infrastructure/persistence/`. Между ними — Mapper.
- **Один EntityManager на запрос** (MikroORM `RequestContext`).
- **Soft delete для справочников** (через флаг `is_deleted` или `deleted_at`); жёсткое удаление — только для технических сущностей (например, истёкших сессий).
- **Все ID — UUID v4** (генерируются на стороне приложения, не БД).
- **Все timestamps — `TIMESTAMPTZ`** (с TZ).
- **Деньги — `NUMERIC(15,2)`** (RUB), хранится в копейках во избежание floating-point — **поправка:** в кодовой базе используется тип `Money` с `bigint` копейки внутри; в БД хранится как `BIGINT cents`. Конверсия на границе persistence.
- **Индексы:** на FK всегда, на часто-фильтруемые столбцы (`status`, `branch_id`, `created_at`), на уникальные ограничения.

### 5.2 ER-диаграммы по контекстам

#### IAM

```mermaid
erDiagram
  user_user ||--o{ user_session : "has"
  user_user ||--o{ user_branch_access : "has"
  user_user ||--o{ user_role_assignment : "has"
  user_invitation ||--o| user_user : "becomes"
  user_user ||--o{ user_audit_log : "creates"

  user_user {
    uuid id PK
    text email
    text phone
    text full_name
    text password_hash
    bool two_factor_enabled
    text totp_secret_encrypted
    text status
    timestamptz created_at
    timestamptz deactivated_at
  }

  user_role_assignment {
    uuid user_id FK
    text role
  }

  user_branch_access {
    uuid user_id FK
    uuid branch_id FK
  }

  user_session {
    uuid id PK
    uuid user_id FK
    text refresh_token_hash
    timestamptz issued_at
    timestamptz expires_at
    text user_agent
    inet ip
  }

  user_invitation {
    uuid id PK
    text email
    text phone
    text full_name
    text token_hash
    text status
    timestamptz expires_at
    timestamptz accepted_at
    uuid invited_by FK
  }

  user_audit_log {
    uuid id PK
    uuid actor_user_id FK
    text action
    text resource_type
    uuid resource_id
    jsonb payload
    timestamptz occurred_at
    inet ip
  }
```

#### Catalog

```mermaid
erDiagram
  catalog_service_category ||--o{ catalog_service : "contains"
  catalog_service ||--o{ catalog_service_pricing : "has"
  catalog_service ||--o{ catalog_material_norm : "has"
  catalog_service ||--o{ catalog_service_price_history : "has"

  catalog_service_category {
    uuid id PK
    text name
    text icon
    int display_order
    bool is_active
  }

  catalog_service {
    uuid id PK
    uuid category_id FK
    text name
    text description_md
    int duration_minutes
    text pricing_type
    bigint base_price_cents
    bool is_active
    int display_order
    timestamptz created_at
    timestamptz updated_at
  }

  catalog_service_pricing {
    uuid service_id FK
    text body_type
    bigint price_cents
  }

  catalog_material_norm {
    uuid id PK
    uuid service_id FK
    uuid sku_id
    numeric amount
    text unit
    jsonb body_type_coefficients
  }

  catalog_service_price_history {
    uuid id PK
    uuid service_id FK
    text pricing_type
    bigint base_price_cents
    jsonb pricing_snapshot
    uuid changed_by FK
    timestamptz changed_at
  }
```

#### Inventory

```mermaid
erDiagram
  inv_sku ||--o{ inv_stock : "stored as"
  inv_sku ||--o{ inv_packaging : "has"
  inv_supplier ||--o{ inv_receipt : "supplies"
  inv_receipt ||--o{ inv_receipt_line : "has"
  inv_receipt_line ||--|| inv_batch : "creates"
  inv_batch }o--|| inv_stock : "belongs to"
  inv_stock ||--o{ inv_stock_movement : "tracks"
  inv_adjustment ||--o{ inv_adjustment_line : "has"
  inv_transfer ||--o{ inv_transfer_line : "has"
  inv_stock_taking ||--o{ inv_stock_taking_line : "has"

  inv_sku {
    uuid id PK
    text article_number
    text name
    text group
    text base_unit
    text barcode
    bool has_expiry
    text photo_url
    bool is_active
    text description_md
    timestamptz created_at
  }

  inv_packaging {
    uuid id PK
    uuid sku_id FK
    text name
    numeric coefficient
  }

  inv_supplier {
    uuid id PK
    text name
    text inn
    text contact_name
    text contact_phone
    text contact_email
    text address
    bool is_active
  }

  inv_stock {
    uuid id PK
    uuid sku_id FK
    uuid branch_id
    numeric reorder_level
    bigint average_cost_cents
    timestamptz updated_at
  }

  inv_batch {
    uuid id PK
    uuid stock_id FK
    uuid supplier_id FK
    text source_type
    uuid source_doc_id
    numeric initial_quantity
    numeric remaining_quantity
    bigint unit_cost_cents
    date expires_at
    timestamptz received_at
  }

  inv_stock_movement {
    uuid id PK
    uuid stock_id FK
    uuid batch_id FK
    text movement_type
    numeric delta
    bigint cost_cents
    text reason
    text source_type
    uuid source_doc_id
    uuid actor_user_id
    timestamptz occurred_at
  }

  inv_receipt {
    uuid id PK
    uuid supplier_id FK
    uuid branch_id
    text supplier_invoice_number
    date supplier_invoice_date
    text status
    text attachment_url
    uuid created_by FK
    uuid posted_by FK
    timestamptz created_at
    timestamptz posted_at
  }

  inv_receipt_line {
    uuid id PK
    uuid receipt_id FK
    uuid sku_id FK
    uuid packaging_id FK
    numeric package_quantity
    numeric base_quantity
    bigint unit_cost_cents
    date expires_at
  }

  inv_adjustment {
    uuid id PK
    uuid branch_id
    text status
    text reason
    bigint total_amount_cents
    uuid created_by FK
    uuid approved_by FK
    timestamptz created_at
    timestamptz approved_at
  }

  inv_adjustment_line {
    uuid id PK
    uuid adjustment_id FK
    uuid sku_id FK
    numeric delta
  }

  inv_transfer {
    uuid id PK
    uuid from_branch_id
    uuid to_branch_id
    text status
    timestamptz posted_at
  }

  inv_stock_taking {
    uuid id PK
    uuid branch_id
    text status
    timestamptz started_at
    timestamptz completed_at
    uuid created_by FK
  }
```

#### CRM

```mermaid
erDiagram
  crm_client ||--o{ crm_vehicle : "owns"
  crm_client ||--o{ crm_consent : "gives"

  crm_client {
    uuid id PK
    text full_name
    text phone_e164
    text email
    date birth_date
    text source
    text type
    text status
    text comment
    timestamptz created_at
    timestamptz anonymized_at
  }

  crm_vehicle {
    uuid id PK
    uuid client_id FK
    text make
    text model
    text body_type
    text license_plate
    text vin
    int year
    text color
    text comment
    bool is_active
  }

  crm_consent {
    uuid id PK
    uuid client_id FK
    text type
    timestamptz given_at
    timestamptz revoked_at
  }
```

#### Scheduling

```mermaid
erDiagram
  sch_branch ||--o{ sch_bay : "has"
  sch_branch ||--o{ sch_branch_schedule : "has"
  sch_master_schedule ||--o{ sch_master_unavailability : "has"
  sch_appointment ||--o{ sch_appointment_service : "has"

  sch_branch {
    uuid id PK
    text name
    text address
    text timezone
    bool is_active
  }

  sch_bay {
    uuid id PK
    uuid branch_id FK
    text name
    bool is_active
  }

  sch_branch_schedule {
    uuid id PK
    uuid branch_id FK
    int day_of_week
    time open_at
    time close_at
    time break_start
    time break_end
  }

  sch_master_schedule {
    uuid id PK
    uuid master_user_id FK
    uuid branch_id FK
    jsonb weekly_pattern
  }

  sch_master_unavailability {
    uuid id PK
    uuid master_schedule_id FK
    timestamptz from_at
    timestamptz to_at
    text reason
  }

  sch_appointment {
    uuid id PK
    uuid client_id
    uuid vehicle_id
    uuid branch_id
    uuid bay_id
    uuid master_user_id
    timestamptz starts_at
    timestamptz ends_at
    text status
    text creation_channel
    uuid created_by
    text cancellation_request_status
    text cancellation_reason
    timestamptz created_at
  }

  sch_appointment_service {
    uuid id PK
    uuid appointment_id FK
    uuid service_id
    text service_name_snapshot
    int duration_snapshot
    bigint price_cents_snapshot
  }
```

#### WorkOrder

```mermaid
erDiagram
  wo_work_order ||--o{ wo_consumption_line : "has"
  wo_work_order ||--o{ wo_photo : "has"

  wo_work_order {
    uuid id PK
    uuid appointment_id
    uuid branch_id
    uuid master_user_id
    uuid client_id
    uuid vehicle_id
    text status
    timestamptz opened_at
    timestamptz closed_at
    text cancellation_reason
    jsonb services_snapshot
    jsonb norms_snapshot
  }

  wo_consumption_line {
    uuid id PK
    uuid work_order_id FK
    uuid sku_id
    numeric actual_amount
    numeric norm_amount
    text deviation_reason
    text comment
  }

  wo_photo {
    uuid id PK
    uuid work_order_id FK
    text type
    text url
    text thumbnail_url
    text mime
    bigint size_bytes
    uuid uploaded_by
    timestamptz uploaded_at
  }
```

#### Notifications

```mermaid
erDiagram
  ntf_template ||--o{ ntf_notification : "instantiates"
  ntf_user_preferences {
    uuid user_id PK
    jsonb subscriptions
    jsonb quiet_hours
  }

  ntf_template {
    text code PK
    text channel
    text subject_template
    text body_template
    text language
    bool is_active
  }

  ntf_notification {
    uuid id PK
    text recipient_type
    uuid recipient_user_id
    text recipient_phone
    text recipient_email
    text template_code FK
    text channel
    jsonb payload
    text status
    int attempts
    text last_error
    text dedup_key
    timestamptz created_at
    timestamptz sent_at
  }

  ntf_push_subscription {
    uuid id PK
    uuid user_id
    text endpoint
    text p256dh_key
    text auth_key
    timestamptz created_at
  }
```

#### Billing

```mermaid
erDiagram
  bil_subscription ||--o{ bil_invoice : "has"

  bil_plan {
    text code PK
    text name
    bigint price_cents_per_month
    int max_branches
    int max_masters
    int max_appointments_per_month
  }

  bil_subscription {
    uuid id PK
    text plan_code FK
    text status
    timestamptz current_period_started_at
    timestamptz next_billing_at
  }

  bil_invoice {
    uuid id PK
    uuid subscription_id FK
    bigint amount_cents
    text status
    timestamptz issued_at
    timestamptz paid_at
  }
```

#### Outbox & Audit (cross-context infrastructure)

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL
);
CREATE INDEX idx_outbox_unpublished ON outbox_events (occurred_at) WHERE published_at IS NULL;
```

### 5.3 Ключевые индексы

```sql
-- IAM
CREATE UNIQUE INDEX uq_user_phone ON user_user(phone) WHERE status != 'DELETED';
CREATE UNIQUE INDEX uq_user_email ON user_user(email) WHERE email IS NOT NULL AND status != 'DELETED';

-- Inventory
CREATE UNIQUE INDEX uq_sku_article ON inv_sku(article_number);
CREATE UNIQUE INDEX uq_stock_sku_branch ON inv_stock(sku_id, branch_id);
CREATE INDEX idx_movement_stock_occurred ON inv_stock_movement(stock_id, occurred_at DESC);
CREATE INDEX idx_movement_source ON inv_stock_movement(source_type, source_doc_id);
CREATE INDEX idx_batch_expiry ON inv_batch(stock_id, expires_at) WHERE remaining_quantity > 0;

-- CRM
CREATE UNIQUE INDEX uq_client_phone ON crm_client(phone_e164) WHERE status = 'ACTIVE';

-- Scheduling
CREATE INDEX idx_appointment_master_starts ON sch_appointment(master_user_id, starts_at);
CREATE INDEX idx_appointment_branch_date ON sch_appointment(branch_id, starts_at);
CREATE INDEX idx_appointment_client ON sch_appointment(client_id, starts_at DESC);
CREATE INDEX idx_appointment_status ON sch_appointment(status) WHERE status IN ('PENDING_CONFIRMATION', 'CONFIRMED');

-- WorkOrder
CREATE UNIQUE INDEX uq_work_order_appointment ON wo_work_order(appointment_id);
CREATE INDEX idx_work_order_master_status ON wo_work_order(master_user_id, status);

-- Notifications
CREATE UNIQUE INDEX uq_notification_dedup ON ntf_notification(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX idx_notification_pending ON ntf_notification(status, created_at) WHERE status = 'PENDING';
```

### 5.4 Стратегия миграций

- **MikroORM Migrations**, генерация автоматическая (`mikro-orm migration:create`).
- Миграции хранятся в `apps/backend/api/src/migrations/` с timestamp в имени.
- Применение в CI перед запуском приложения; команда `mikro-orm migration:up`.
- **Запрет на data-миграции в schema-миграциях** — отдельные seed-скрипты.
- Каждая миграция должна быть **обратимой** (метод `down()`); миграции «без даунгрейда» проходят ревью отдельно.

### 5.5 Database seeders

Seeders живут в `apps/backend/api/src/seeders/` и используют официальный `@mikro-orm/seeder`.

**Назначение:**
- начальные данные для локальной разработки;
- демо-данные для пилотных запусков;
- объёмные данные для ручного нагрузочного тестирования.

**Правила:**
- `DatabaseSeeder` — единственная точка входа, вызывает дочерние сидеры в FK-safe порядке: IAM → Catalog → CRM → Inventory → Scheduling → WorkOrder.
- Каждый дочерний сидер идемпотентен: перед вставкой проверяет наличие данных и безопасен для повторного запуска.
- Большие наборы данных вставляются батчами по 500-1000 записей.
- После каждого батча обязательно выполняется `em.flush()` и `em.clear()`, чтобы не держать весь Identity Map в памяти.
- Реалистичные демо-данные генерируются через `@faker-js/faker` с русской локалью (`fakerRU`): ФИО, адреса, телефоны E.164, госномера.
- Seeders используют persistence-схемы (`*Schema`) и не вызывают domain/use-case логику.

**Команды:**

```bash
pnpm nx run api:migration:up
pnpm nx run api:seed
pnpm nx run api:seed:fresh
```

**MikroORM config:**
- `extensions: [Migrator, SeedManager]`;
- `seeder.defaultSeeder = 'DatabaseSeeder'`;
- `seeder.pathTs = 'apps/backend/api/src/seeders'`.

### 5.6 Soft delete

- В справочниках (sku, supplier, service, branch) используем флаг `is_active`. «Удаление» = `is_active = false`.
- В client используем `status = 'ANONYMIZED'` с очисткой ПДн.
- В user — `status = 'DEACTIVATED'`.
- Жёсткое удаление: outbox-события (после публикации > 7 дней), notification (после доставки > 90 дней) — выполняется retention-job'ом.

### 5.7 Изоляция транзакций

- По умолчанию `READ COMMITTED`.
- Для критических операций (бронирование слота, списание со склада) используется **оптимистичная блокировка** через колонку `version` (MikroORM `@Version()`).
- Race-condition сценарий: два клиента одновременно бронируют один слот. Первый коммит выигрывает, второй получает `OptimisticLockError` → 409 Conflict с сообщением «Слот только что был занят».

---

## 6. Backend архитектура (NestJS + DDD + MikroORM)

### 6.1.0 Структура монорепо: разделение по платформам

Монорепо разбит на **платформы** на верхнем уровне, чтобы backend, frontend и потенциальные мобильное / десктопное приложения не смешивались в одной куче и были физически изолированы через `@nx/enforce-module-boundaries`.

```
detailing-studio/
├── apps/
│   ├── backend/
│   │   └── api/                          # NestJS (тонкий bootstrap)   platform:node
│   │
│   ├── frontend/
│   │   ├── admin/                        # Angular SPA (OWNER, MANAGER) platform:angular
│   │   ├── admin-e2e/                    # Playwright
│   │   ├── master/                       # Angular PWA (MASTER)        platform:angular
│   │   ├── master-e2e/
│   │   ├── client/                       # Angular PWA (CLIENT)        platform:angular
│   │   └── client-e2e/
│   │
│   ├── mobile/                           # 📦 placeholder под Capacitor / Flutter / RN
│   └── desktop/                          # 📦 placeholder под Tauri / Electron
│
├── libs/
│   ├── shared/                           # platform:any — общее для FE и BE
│   │   ├── contracts/                    # OpenAPI/DTO, генерируется из BE
│   │   ├── types/                        # Brand-типы ID (UserId, AppointmentId, ...)
│   │   └── util-pure/                    # Money, date, RU phone validator — чистый TS
│   │
│   ├── backend/                          # platform:node
│   │   ├── shared/
│   │   │   ├── ddd/                      # AggregateRoot, Entity, VO, DomainEvent
│   │   │   ├── outbox/                   # Outbox table + Service + Poller
│   │   │   ├── auth/                     # AuthGuard, CASL infra, JWT helpers
│   │   │   ├── http/                     # GlobalExceptionFilter, ProblemDetails
│   │   │   ├── querying/                 # DynamicQuery: фильтры, сортировка, пагинация для list-эндпоинтов
│   │   │   └── testing/                  # TestModuleBuilder, fixtures
│   │   ├── iam/{domain,application,infrastructure,interfaces}/
│   │   ├── catalog/...
│   │   ├── inventory/...
│   │   ├── crm/...
│   │   ├── scheduling/...
│   │   ├── work-order/...
│   │   ├── notifications/...
│   │   └── billing/...
│   │
│   ├── frontend/                         # platform:angular
│   │   ├── shared/
│   │   │   ├── ui/                       # Taiga UI обёртки + Tailwind токены
│   │   │   ├── ui-layout/
│   │   │   ├── data-access/              # base http-клиент, interceptors
│   │   │   ├── auth/                     # AuthService, AuthGuard (Angular)
│   │   │   ├── i18n/
│   │   │   └── pwa/                      # SW, offline queue
│   │   ├── iam/{data-access,feature-login,feature-otp,...}/
│   │   ├── catalog/...
│   │   ├── inventory/...
│   │   ├── crm/...
│   │   ├── scheduling/...
│   │   └── work-order/...
│   │
│   ├── mobile/                           # 📦 placeholder
│   └── desktop/                          # 📦 placeholder
```

**Ключевые правила:**

- **Платформенные тэги** (`platform:node`, `platform:angular`, `platform:mobile`, `platform:desktop`, `platform:any`) — это ПЕРВИЧНЫЙ барьер `@nx/enforce-module-boundaries`. `platform:node` ↔ `platform:angular` — взаимный запрет на импорты. `platform:any` доступен всем.
- **`libs/shared/*`** (platform:any) — единственное место для кода, который ходит и в браузер, и на сервер: только pure TypeScript, никаких декораторов NestJS / Angular, никакого rxjs / mikro-orm.
- **`libs/backend/shared/*`** (platform:node) — общая бэкенд-инфраструктура (DDD-примитивы, outbox, auth, http-фильтры, тест-утилиты).
- **`libs/frontend/shared/*`** (platform:angular) — общая фронтовая инфраструктура (Taiga-обёртки, базовый http-клиент, auth-guards, i18n, PWA).
- **Path aliases (`@det/...`)** — три верхних namespace:
  - `@det/shared/*` — `libs/shared/*` (FE+BE).
  - `@det/backend/*` — `libs/backend/*` (только Node).
  - `@det/frontend/*` — `libs/frontend/*` (только Angular).
- **`apps/backend/api`** под платформой, даже если бэк один. Это даёт место под будущие `apps/backend/worker/` (выделенный outbox-poller / BullMQ-воркер) или `apps/backend/admin-cli/`.
- **`apps/mobile/` и `apps/desktop/`** — пустые папки с README в MVP (что туда идёт, какая ожидается технология). Apps создаются, когда соответствующие платформы становятся актуальными.

### 6.1 Слоистая структура bounded context

Монорепо разделён по платформам на верхнем уровне (см. § 6.1.0): backend живёт в `apps/backend/` и `libs/backend/`, frontend — в `apps/frontend/` и `libs/frontend/`. Каждый bounded context на бэке — это **4 отдельных Nx-library** (по одной на слой) внутри `libs/backend/<context-name>/`. Это даёт `@nx/enforce-module-boundaries` возможность блокировать кросс-слойные и кросс-контекстные импорты на уровне Nx-границ — простой папкой внутри `apps/backend/api/src/contexts/` этого добиться нельзя, так как Nx не воспринимает её как самостоятельную сущность с тегами. Платформенные тэги (`platform:node` для backend-libs, `platform:angular` для frontend-libs) добавляют физическую стену между Nest-кодом и Angular-кодом.

```
libs/backend/
└── work-order/
    ├── domain/                                ← Nx lib (scope:work-order, type:domain, platform:node)
    │   └── src/lib/
    │       ├── work-order.aggregate.ts
    │       ├── work-order.events.ts
    │       ├── consumption-line.entity.ts
    │       ├── photo-ref.value-object.ts
    │       ├── work-order-status.enum.ts
    │       ├── work-order.repository.ts          # interface
    │       ├── policies/
    │       │   ├── norm-deviation.policy.ts
    │       │   └── closing-validator.ts
    │       └── errors/
    │           └── work-order.errors.ts
    │
    ├── application/                           ← Nx lib (scope:work-order, type:application, platform:node)
    │   └── src/lib/
    │       ├── commands/
    │       │   ├── close-work-order.command.ts
    │       │   ├── close-work-order.handler.ts
    │       │   └── ...
    │       ├── queries/
    │       │   ├── get-work-order.query.ts
    │       │   ├── get-work-order.handler.ts
    │       │   └── ...
    │       ├── ports/
    │       │   ├── photo-storage.port.ts          # interface
    │       │   └── inventory-stock.port.ts        # ACL к Inventory
    │       ├── sagas/
    │       │   └── close-work-order.saga.ts
    │       ├── dto/
    │       │   └── work-order.dto.ts
    │       ├── tokens.ts                          # DI-токены (Symbol)
    │       └── work-order-application.module.ts
    │
    ├── infrastructure/                        ← Nx lib (scope:work-order, type:infrastructure, platform:node)
    │   └── src/lib/
    │       ├── persistence/
    │       │   ├── work-order.schema.ts           # MikroORM EntitySchema
    │       │   ├── consumption-line.schema.ts
    │       │   ├── photo.schema.ts
    │       │   ├── work-order.mapper.ts           # domain ↔ schema
    │       │   └── work-order.repository.impl.ts
    │       ├── adapters/
    │       │   ├── minio-photo-storage.adapter.ts
    │       │   └── inventory-stock-port.adapter.ts
    │       └── work-order-infrastructure.module.ts
    │
    └── interfaces/                            ← Nx lib (scope:work-order, type:interfaces, platform:node)
        └── src/lib/
            ├── http/
            │   ├── work-order.controller.ts
            │   ├── work-order.dto.ts
            │   └── work-order.swagger.ts
            ├── ws/
            │   └── work-order.gateway.ts
            └── work-order-interfaces.module.ts
```

**`apps/backend/api` подключает только `Infrastructure` + `Interfaces`** модули каждого контекста; `Application` подтягивается транзитивно. В `apps/backend/api/src/` нет доменного кода — только `main.ts`, `app.module.ts`, конфиги и миграции.

**Правила границ:**
1. `domain/` — только TS, никаких внешних импортов (NestJS, MikroORM, axios).
2. `application/` — может импортировать `domain/`, но не `infrastructure/`. Зависимости получает через интерфейсы (ports).
3. `infrastructure/` — реализует интерфейсы, использует внешние библиотеки.
4. `interfaces/` — точка входа (HTTP, WS, CLI). Транслирует входы в команды/запросы, выходы — в DTO.
5. **Кросс-контекст:** один контекст не импортирует `domain/` другого. Только через ACL-порт в `application/ports/`.

Эти правила enforce-ятся через **Nx tags** + `@nx/eslint-plugin:enforce-module-boundaries`:

```json
// nx.json (фрагмент)
{
  "tags": [
    "scope:work-order",
    "scope:inventory",
    "scope:scheduling",
    "scope:catalog",
    "scope:crm",
    "scope:iam",
    "scope:notifications",
    "scope:billing",
    "scope:shared",
    "type:domain",
    "type:application",
    "type:infrastructure",
    "type:interfaces"
  ]
}
```

```json
// .eslintrc.json
{
  "rules": {
    "@nx/enforce-module-boundaries": ["error", {
      "depConstraints": [
        { "sourceTag": "type:domain", "onlyDependOnLibsWithTags": ["type:domain", "scope:shared"] },
        { "sourceTag": "type:application", "onlyDependOnLibsWithTags": ["type:domain", "type:application", "scope:shared"] },
        { "sourceTag": "type:infrastructure", "onlyDependOnLibsWithTags": ["type:domain", "type:application", "type:infrastructure", "scope:shared"] },
        { "sourceTag": "type:interfaces", "onlyDependOnLibsWithTags": ["type:application", "type:interfaces", "scope:shared"] }
      ]
    }]
  }
}
```

### 6.2 Базовые DDD-примитивы (`libs/backend/shared/ddd`)

```ts
// libs/backend/shared/ddd/src/lib/aggregate-root.ts
export abstract class AggregateRoot<TId = string> {
  private _domainEvents: DomainEvent[] = [];

  protected addEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  abstract get id(): TId;
}

export abstract class Entity<TId = string> {
  abstract get id(): TId;
}

export abstract class ValueObject {
  equals(other: this): boolean {
    return JSON.stringify(this) === JSON.stringify(other);
  }
}

export interface DomainEvent {
  readonly eventId: string;        // UUID
  readonly occurredAt: Date;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
  readonly payload: Record<string, unknown>;
}
```

### 6.3 Маппинг domain ↔ persistence (Mapper-паттерн)

```ts
// infrastructure/persistence/work-order.schema.ts
@Entity({ tableName: 'wo_work_order' })
export class WorkOrderSchema {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid' })
  appointmentId!: string;

  @Enum(() => WorkOrderStatusEnum)
  status!: WorkOrderStatusEnum;

  @Property({ type: 'jsonb' })
  servicesSnapshot!: ServiceSnapshotJson[];

  @OneToMany(() => ConsumptionLineSchema, line => line.workOrder, { orphanRemoval: true })
  consumptionLines = new Collection<ConsumptionLineSchema>(this);

  // ... остальные поля
}

// infrastructure/persistence/work-order.mapper.ts
export class WorkOrderMapper {
  static toDomain(schema: WorkOrderSchema): WorkOrder {
    return WorkOrder.restore({
      id: WorkOrderId.from(schema.id),
      appointmentId: AppointmentId.from(schema.appointmentId),
      status: WorkOrderStatus.from(schema.status),
      services: schema.servicesSnapshot.map(s => WorkOrderService.restore(s)),
      consumption: schema.consumptionLines.getItems().map(ConsumptionLineMapper.toDomain),
      // ...
    });
  }

  static toPersistence(domain: WorkOrder, schema: WorkOrderSchema | null): WorkOrderSchema {
    const out = schema ?? new WorkOrderSchema();
    out.id = domain.id.toString();
    out.appointmentId = domain.appointmentId.toString();
    out.status = domain.status.value;
    out.servicesSnapshot = domain.services.map(s => s.toSnapshot());
    // важно: коллекции merge через ConsumptionLineMapper
    return out;
  }
}
```

### 6.4 Реализация репозитория

```ts
// infrastructure/persistence/work-order.repository.impl.ts
@Injectable()
export class WorkOrderRepositoryImpl implements IWorkOrderRepository {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async findById(id: WorkOrderId): Promise<WorkOrder | null> {
    const schema = await this.em.findOne(WorkOrderSchema, { id: id.toString() }, { populate: ['consumptionLines', 'photos'] });
    return schema ? WorkOrderMapper.toDomain(schema) : null;
  }

  async save(workOrder: WorkOrder): Promise<void> {
    const existing = await this.em.findOne(WorkOrderSchema, { id: workOrder.id.toString() }, { populate: ['consumptionLines', 'photos'] });
    const persisted = WorkOrderMapper.toPersistence(workOrder, existing);

    // outbox: события агрегата добавляются ДО flush, чтобы попасть в ту же транзакцию
    const events = workOrder.pullDomainEvents();
    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
```

### 6.5 Outbox publisher

```ts
// infrastructure/outbox/outbox.service.ts
@Injectable()
export class OutboxService {
  async append(event: DomainEvent, em: EntityManager): Promise<void> {
    em.persist(em.create(OutboxEventSchema, {
      id: event.eventId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload,
      occurredAt: event.occurredAt,
    }));
  }
}

// infrastructure/outbox/outbox.poller.ts
@Injectable()
export class OutboxPoller {
  @Cron('*/1 * * * * *') // каждую секунду
  async poll(): Promise<void> {
    await this.em.transactional(async (em) => {
      const events = await em.find(OutboxEventSchema, { publishedAt: null }, { limit: 100, orderBy: { occurredAt: 'asc' } });
      for (const event of events) {
        try {
          await this.eventBus.publish(this.deserialize(event));
          event.publishedAt = new Date();
          event.attempts += 1;
        } catch (e) {
          event.attempts += 1;
          event.lastError = e.message;
          if (event.attempts > 5) {
            // алерт в DLQ
          }
        }
      }
    });
  }
}
```

### 6.6 Карта Nest-модулей

```ts
// apps/backend/api/src/app/app.module.ts
@Module({
  imports: [
    // Infrastructure
    ConfigModule.forRoot({ isGlobal: true, validationSchema: configValidationSchema }),
    MikroOrmModule.forRootAsync(mikroOrmConfigFactory),
    BullModule.forRoot({ connection: redisConnection }),
    PinoLoggerModule.forRoot(loggerConfig),
    HealthModule,
    OutboxModule,
    AuditLogModule,
    CqrsModule,

    // Bounded contexts — подключаются Infrastructure + Interfaces модули,
    // Application подтягивается транзитивно
    IamInfrastructureModule,           IamInterfacesModule,
    CatalogInfrastructureModule,       CatalogInterfacesModule,
    InventoryInfrastructureModule,     InventoryInterfacesModule,
    CrmInfrastructureModule,           CrmInterfacesModule,
    SchedulingInfrastructureModule,    SchedulingInterfacesModule,
    WorkOrderInfrastructureModule,     WorkOrderInterfacesModule,
    NotificationsInfrastructureModule, NotificationsInterfacesModule,
    BillingInfrastructureModule,       BillingInterfacesModule,

    // Cross-cutting
    AuthGuardModule,
    RateLimitModule,
  ],
})
export class AppModule {}
```

Контекст разбит на 3 Nest-модуля (по одному на слой application/infrastructure/interfaces — domain без Nest-модуля, это чистый TS):

```ts
// libs/backend/work-order/application/src/lib/work-order-application.module.ts
@Module({
  imports: [CqrsModule],
  providers: [
    // CommandHandlers
    OpenWorkOrderHandler,
    CloseWorkOrderHandler,
    AddPhotoHandler,
    AddConsumptionLineHandler,
    // QueryHandlers
    GetWorkOrderHandler,
    // Sagas
    CloseWorkOrderSaga,
    // Domain policies (если требуют DI; чистые могут быть просто функциями)
    NormDeviationPolicy,
    ClosingValidator,
  ],
  exports: [], // application наружу ничего не экспортирует — только через CqrsModule
})
export class WorkOrderApplicationModule {}
```

```ts
// libs/backend/work-order/infrastructure/src/lib/work-order-infrastructure.module.ts
@Module({
  imports: [
    WorkOrderApplicationModule,
    MikroOrmModule.forFeature([WorkOrderSchema, ConsumptionLineSchema, PhotoSchema]),
    OutboxModule,
  ],
  providers: [
    { provide: WORK_ORDER_REPOSITORY, useClass: WorkOrderRepositoryImpl },
    { provide: PHOTO_STORAGE_PORT,    useClass: MinioPhotoStorageAdapter },
    { provide: INVENTORY_STOCK_PORT,  useClass: InventoryStockPortAdapter },
  ],
  exports: [
    WorkOrderApplicationModule,           // транзитивно отдаём application наружу
    INVENTORY_STOCK_PORT,                 // ACL-порт, который потребляют другие контексты
  ],
})
export class WorkOrderInfrastructureModule {}
```

```ts
// libs/backend/work-order/interfaces/src/lib/work-order-interfaces.module.ts
@Module({
  imports: [WorkOrderInfrastructureModule],
  controllers: [WorkOrderController],
  providers: [WorkOrderGateway],
})
export class WorkOrderInterfacesModule {}
```

### 6.7 Валидация

- **На границе HTTP** — `class-validator` + `class-transformer` через ValidationPipe (или Zod через nestjs-zod). Валидируется DTO: формат, длина, диапазоны, обязательность.
- **В domain** — инварианты в конструкторах/фабриках агрегатов. Без декораторов; чистый TypeScript:
  ```ts
  static create(props: CreateAppointmentProps): Appointment {
    if (props.services.length === 0) {
      throw new EmptyAppointmentServicesError();
    }
    if (props.slot.duration < sumDuration(props.services)) {
      throw new SlotTooShortError(props.slot.duration, sumDuration(props.services));
    }
    return new Appointment({...});
  }
  ```
- **На уровне БД** — constraints (UNIQUE, FK, CHECK) дублируют ключевые инварианты. Защита от багов в коде.

### 6.8 Обработка ошибок

```ts
// shared/errors/domain-error.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly details?: Record<string, unknown>;
}

export class InsufficientStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';
  readonly httpStatus = 422;
  constructor(public readonly skuId: string, public readonly available: number, public readonly requested: number) {
    super(`Insufficient stock: available ${available}, requested ${requested}`);
  }
}

// interfaces/http/exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    if (exception instanceof DomainError) {
      response.status(exception.httpStatus).send(this.toProblemDetails(exception));
      return;
    }
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).send(this.toProblemDetails(exception));
      return;
    }
    // unknown
    this.logger.error(exception);
    response.status(500).send(this.toProblemDetails(new InternalServerError()));
  }
}
```

### 6.9 Типобезопасные ID и VO

Используем `nominal types` через брендирование, чтобы избежать перепутывания ID:

```ts
// shared/ids.ts
type Brand<T, B> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type ClientId = Brand<string, 'ClientId'>;
export type AppointmentId = Brand<string, 'AppointmentId'>;

export const UserId = {
  generate: (): UserId => uuidv4() as UserId,
  from: (s: string): UserId => {
    if (!isUuid(s)) throw new InvalidUserIdError(s);
    return s as UserId;
  },
};
```

Это позволяет компилятору ловить ошибки типа «передал ClientId туда, где ожидается AppointmentId».

### 6.10 Dynamic Querying (`libs/backend/shared/querying`)

Библиотека для декларативных list-эндпоинтов с фильтрацией, сортировкой и пагинацией. Архитектура: **Core AST + ORM Adapter**.

**Структура:**

```
libs/backend/shared/querying/
├── core/                          # ORM-агностичное ядро
│   ├── dynamic-query-ast.parser.ts  # Парсер строки фильтров → AST
│   ├── dynamic-query.types.ts       # AST-типы, конфиг, операторы
│   ├── dynamic-query.errors.ts      # Иерархия ошибок
│   ├── dynamic-query-compiler.ts    # Базовый интерфейс компилятора
│   └── orm-adapter.ts               # Интерфейс ORM-адаптера
├── mikro-orm/                     # MikroORM-адаптер
│   ├── mikro-orm-dynamic-query.adapter.ts   # AST → FilterQuery + FindOptions
│   └── mikro-orm-dynamic-query.compiler.ts  # Parser + Adapter = Compiler
├── dto/                           # NestJS DTO
│   ├── dynamic-query.dto.ts         # DynamicQueryDto (page, pageSize, sorts, filters)
│   └── paginated-response.dto.ts    # PaginatedResponseDto + createPaginatedResponse()
└── index.ts                       # Public API
```

**Операторы фильтрации:**

| Оператор | Значение | Пример |
|----------|----------|--------|
| `==` | Equals | `status==ACTIVE` |
| `!=` | Not equals | `status!=DELETED` |
| `>`, `<`, `>=`, `<=` | Сравнение | `age>=18` |
| `@=` | Contains (ilike) | `name@=Иван` |
| `_=` | Starts with | `name_=Ив` |
| `^=` | Ends with | `name^=ов` |
| `!@=` | Not contains | `name!@=bot` |
| `*=` | In | `status*=ACTIVE,PENDING` |
| `!*=` | Not in | `id!*=a,b` |

**Логические операции:** `,` = AND, `|` = OR. Пример: `status==ACTIVE,age>18|isActive==true`.

**Конфигурация полей:**

```ts
const config: DynamicQueryParserConfig = {
  allowedFields: {
    status: { type: 'string' },
    age: { type: 'number' },
    'client.name': { type: 'string', path: 'client.name' },
    id: { type: 'string', operators: ['==', '!='] },
    search: { type: 'string', customFilter: 'fullTextSearch' },
    relevance: { sortable: true, customSort: 'byRelevance' },
  },
  maxPageSize: 100,
  defaultPageSize: 25,
  defaultSorts: '-createdAt',
  maxFilterLength: 2000,
  maxConditions: 20,
  maxSorts: 10,
};
```

**Иерархия ошибок:**

| Ошибка | Контекст | Когда |
|--------|----------|-------|
| `DynamicQueryError` | `code` | Базовый класс |
| `DynamicQueryFieldError` | `field`, `reason` | Поле не в whitelist / не filterable / не sortable / unsafe path |
| `DynamicQueryOperatorError` | `field`, `operator` | Запрещённый оператор для поля |
| `DynamicQueryValueError` | `rawValue`, `expectedType` | Ошибка приведения типа |
| `DynamicQueryPaginationError` | `parameter`, `value` | page/pageSize невалидны |
| `DynamicQueryCustomFilterError` | `filterName` | Незарегистрированный custom filter |
| `DynamicQueryLimitError` | `limitName`, `limit` | Превышение safety-лимита |

**Использование в контроллере:**

```ts
@Controller('clients')
export class ClientController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly compiler: MikroOrmDynamicQueryCompiler<ClientSchema>,
  ) {}

  @Get()
  list(@Query() dto: DynamicQueryDto) {
    const { where, options, page, pageSize } = this.compiler.compile(dto, config);
    return this.queryBus.execute(new ListClientsQuery(where, options, page, pageSize));
  }
}
```

**Расширяемость:**
- **Custom filters** — для полей, которые маппятся нестандартно (полнотекстовый поиск, агрегации).
- **Custom sorts** — для вычисляемых полей (релевантность, расстояние).
- **ORM-адаптеры** — ядро ORM-агностично; `MikroOrmDynamicQueryAdapter` — первая реализация.

---

## 7. Frontend архитектура (Nx + Angular + Signals)

### 7.1 Nx Workspace структура

> Ниже показан **только фронтовый срез** `libs/frontend/<ctx>/`. Под тем же контекстом параллельно лежат **4 backend-lib** (`libs/backend/<ctx>/{domain,application,infrastructure,interfaces}`) — см. § 6.1. Тэги `platform:angular` / `platform:node` на фронт-/бэк-libs предотвращают случайные кросс-импорты между Angular-кодом и NestJS-кодом через `@nx/enforce-module-boundaries`.

```
.
├── apps/
│   ├── admin/                          # Angular SPA
│   ├── client/                         # Angular PWA
│   ├── master/                         # Angular PWA
│   ├── admin-e2e/                      # Playwright
│   ├── client-e2e/
│   ├── master-e2e/
│   └── api/                            # NestJS (тонкий bootstrap-слой)
│
├── libs/
│   ├── shared/
│   │   ├── ui/                         # переиспользуемые компоненты Taiga + Tailwind  (platform:angular)
│   │   ├── ui-layout/                  # навигация, layout-обёртки                       (platform:angular)
│   │   ├── data-access/                # http-клиенты, типы DTO                          (platform:angular)
│   │   ├── util/                       # хелперы (date, money, validation)               (platform:any)
│   │   ├── auth/                       # auth-guard, interceptor, AuthService            (platform:angular)
│   │   ├── i18n/                       # переводы                                        (platform:angular)
│   │   ├── pwa/                        # service-worker, push-subscriptions              (platform:angular)
│   │   ├── types/                      # OpenAPI-сгенерированные типы (опц.)
│   │   ├── ddd/                        # AggregateRoot, Entity, VO, DomainEvent, Money   (platform:node)
│   │   └── outbox/                     # Outbox-таблица, OutboxService                   (platform:node)
│   │
│   ├── catalog/                        # backend libs: domain/, application/, infrastructure/, interfaces/  (см. § 6.1)
│   │   ├── feature-services/           # routed feature: список и карточка услуг          (platform:angular)
│   │   ├── feature-categories/
│   │   ├── data-access/                # signal-stores + http-репозиторий                 (platform:angular)
│   │   └── ui/                         # «глупые» UI-компоненты контекста                 (platform:angular)
│   │
│   ├── inventory/
│   │   ├── feature-skus/
│   │   ├── feature-suppliers/
│   │   ├── feature-receipts/
│   │   ├── feature-adjustments/
│   │   ├── feature-stocktakings/
│   │   ├── feature-stock-overview/
│   │   ├── feature-movements/
│   │   ├── data-access/
│   │   └── ui/
│   │
│   ├── crm/
│   │   ├── feature-clients/
│   │   ├── feature-vehicles/
│   │   ├── data-access/
│   │   └── ui/
│   │
│   ├── scheduling/
│   │   ├── feature-schedule-week/      # для admin
│   │   ├── feature-schedule-day/       # для admin и master
│   │   ├── feature-booking-wizard/     # для client
│   │   ├── feature-availability/       # выбор слота
│   │   ├── data-access/
│   │   └── ui/
│   │
│   ├── work-order/
│   │   ├── feature-active-orders/      # для master
│   │   ├── feature-order-card/         # карточка наряда (общая)
│   │   ├── feature-photo-uploader/
│   │   ├── feature-consumption-form/
│   │   ├── data-access/
│   │   └── ui/
│   │
│   ├── iam/
│   │   ├── feature-login/
│   │   ├── feature-otp/
│   │   ├── feature-oauth-callback/
│   │   ├── feature-staff/              # admin
│   │   ├── feature-profile/
│   │   ├── feature-2fa/
│   │   ├── data-access/
│   │   └── ui/
│   │
│   ├── notifications/
│   │   ├── feature-preferences/
│   │   ├── feature-feed/
│   │   ├── data-access/
│   │   └── ui/
│   │
│   ├── billing/
│   │   ├── feature-subscription/
│   │   ├── data-access/
│   │   └── ui/
│   │
│   └── reports/
│       ├── feature-stock-on-date/
│       ├── feature-movements/
│       ├── feature-low-stock/
│       ├── feature-revenue/
│       ├── feature-norm-deviations/
│       ├── data-access/
│       └── ui/
│
├── tools/
└── nx.json
```

**Правила:**
- `feature-*` — отвечает за маршрут и страничный компонент. Может импортировать `data-access`, `ui`, `shared/*`.
- `data-access` — Angular services (репозитории/HTTP-клиенты), signal-stores. Не зависит от UI.
- `ui` — «глупые» компоненты, не имеют HTTP-зависимостей.
- Кросс-context импорты: только через `data-access` (например, `scheduling/feature-booking-wizard` использует `catalog/data-access` для получения каталога услуг).

### 7.2 Nx tags для frontend

```json
{
  "tags": [
    "platform:angular",
    "scope:admin",
    "scope:client",
    "scope:master",
    "scope:shared",
    "scope:catalog",
    "scope:inventory",
    ...
    "type:feature",
    "type:ui",
    "type:data-access",
    "type:util"
  ]
}
```

Правила границ (упрощённо):
- `apps/frontend/admin` → может импортировать только `feature-*` с `scope:admin` или `scope:shared`/`scope:<context>` (`platform:angular`).
- `apps/frontend/client` → только client-friendly features (`booking-wizard`, `account`, ...).
- `apps/frontend/master` → только master-features (`active-orders`, `order-card`, ...).
- `feature-*` → не зависит от других `feature-*` (используются через router'ом).

### 7.3 State management — Angular Signals + сервисы

Никакого NgRx, никакого TanStack Query. Только нативные средства Angular 19+.

```ts
// libs/frontend/work-order/data-access/src/lib/active-orders.store.ts
@Injectable({ providedIn: 'root' })
export class ActiveOrdersStore {
  private readonly api = inject(WorkOrderApi);

  readonly orders = signal<WorkOrderListItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly inProgress = computed(() => this.orders().filter(o => o.status === 'IN_PROGRESS'));
  readonly count = computed(() => this.orders().length);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await firstValueFrom(this.api.listMyActive());
      this.orders.set(items);
    } catch (e) {
      this.error.set(extractMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  optimisticUpdateStatus(id: string, status: WorkOrderStatus): void {
    this.orders.update(list => list.map(o => o.id === id ? { ...o, status } : o));
  }
}
```

Для серверного состояния с автоматическим refresh — используется `resource()` API:

```ts
// libs/frontend/scheduling/data-access/src/lib/availability.resource.ts
export const availabilityResource = (params: Signal<AvailabilityParams | null>) => resource({
  request: () => params(),
  loader: async ({ request, abortSignal }) => {
    if (!request) return [];
    return inject(SchedulingApi).getAvailability(request, { signal: abortSignal });
  },
});
```

**Принципы:**
- Один store на feature, не глобальный.
- Сторы — singletons через `providedIn: 'root'` для shared между фичами; иначе — `providedIn: 'any'` или провайдер на feature-route.
- Optimistic updates — через `signal.update()`.
- Side effects — через `effect()` в компоненте (только для UI-эффектов, бизнес-сайд-эффекты — в сторе).

### 7.4 HTTP-клиенты

```ts
// libs/frontend/work-order/data-access/src/lib/work-order.api.ts
@Injectable({ providedIn: 'root' })
export class WorkOrderApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listMyActive() {
    return this.http.get<WorkOrderListItem[]>(`${this.baseUrl}/work-orders/my`);
  }

  getById(id: string) {
    return this.http.get<WorkOrderDetail>(`${this.baseUrl}/work-orders/${id}`);
  }

  close(id: string) {
    return this.http.post<void>(`${this.baseUrl}/work-orders/${id}/close`, {});
  }
}
```

**HTTP-interceptors:**
- `AuthInterceptor` — добавляет `Authorization: Bearer`.
- `RefreshInterceptor` — на 401 пытается обновить токен через refresh, ретраит запрос.
- `ErrorInterceptor` — преобразует RFC 7807 в типизированные ошибки.
- `RequestIdInterceptor` — добавляет `X-Request-Id` для трейсинга.
- `LoadingInterceptor` (опц.) — глобальный счётчик активных запросов.

### 7.5 Маршрутизация

- **Lazy loading** — каждая `feature-*` библиотека загружается по requested route.
- **Route guards:**
  - `authGuard` — проверка наличия валидного токена.
  - `roleGuard` — проверка роли (например, `[OWNER]` для биллинга).
  - `branchAccessGuard` — проверка доступа к филиалу.
- **Reactive Resolvers**: предзагрузка данных через `inject(SomeStore).load()`.

```ts
// apps/frontend/admin/src/app/app.routes.ts
export const appRoutes: Routes = [
  { path: 'login', loadChildren: () => import('@det/frontend/iam/feature-login').then(m => m.routes) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadChildren: () => import('@det/frontend/admin/feature-dashboard').then(m => m.routes) },
      { path: 'schedule',  loadChildren: () => import('@det/frontend/scheduling/feature-schedule-week').then(m => m.routes) },
      { path: 'clients',   loadChildren: () => import('@det/frontend/crm/feature-clients').then(m => m.routes) },
      { path: 'inventory', loadChildren: () => import('@det/frontend/inventory/feature-stock-overview').then(m => m.routes) },
      // ...
      {
        path: 'billing',
        canActivate: [roleGuard(['OWNER'])],
        loadChildren: () => import('@det/frontend/billing/feature-subscription').then(m => m.routes),
      },
    ],
  },
];
```

### 7.6 Формы

**Reactive Forms** + Taiga UI компоненты.

```ts
// libs/frontend/inventory/feature-receipts/src/lib/receipt-form/receipt-form.component.ts
@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TuiInputModule,
    TuiInputDateModule,
    TuiSelectModule,
    TuiButtonModule,
    // ...
  ],
  templateUrl: './receipt-form.component.html',
})
export class ReceiptFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    supplierId: this.fb.control<string>('', { validators: [Validators.required] }),
    invoiceNumber: this.fb.control<string>(''),
    invoiceDate: this.fb.control<Date | null>(null),
    branchId: this.fb.control<string>('', { validators: [Validators.required] }),
    lines: this.fb.array<FormGroup<ReceiptLineForm>>([], { validators: [minLength(1)] }),
  });

  addLine() { /* ... */ }
  submit() {
    if (this.form.invalid) return;
    this.store.create(this.form.getRawValue());
  }
}
```

**Принципы:**
- Все валидаторы — переиспользуемые из `libs/shared/util-pure` (импортируются как `@det/shared/util`).
- Валидация ошибок — централизованная через директиву `[tuiTextfieldErrorContent]`.
- Сложные формы — разбиваются на child-компоненты с `ControlValueAccessor`.

### 7.7 Taiga UI + Tailwind

**Принцип сосуществования:**

- Taiga UI владеет: цветами темы, типографикой, состояниями компонентов, иконками.
- Tailwind владеет: layout (`flex`, `grid`, `gap`), spacing (`p-*`, `m-*`), границы экранов (`md:`, `lg:`).
- **Tailwind не используется для цветов:** не пишем `bg-blue-500` — пишем `tuiAppearance="primary"` или CSS-переменную `var(--tui-primary)`.

```html
<!-- хорошо -->
<div class="flex gap-4 p-6 md:grid md:grid-cols-3">
  <button tuiButton appearance="primary">Сохранить</button>
  <button tuiButton appearance="secondary">Отмена</button>
</div>

<!-- плохо: ломает темизацию Taiga -->
<button class="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">Сохранить</button>
```

Тёмная тема: переключение через атрибут `[attr.tuiTheme]` на корне приложения.

### 7.8 PWA

- **Service Worker** — Angular Service Worker (`@angular/service-worker`) + дополнительные хэндлеры через Workbox.
- **Manifest:** иконки, theme_color, display: standalone.
- **Strategy:**
  - Static assets (JS, CSS, fonts): `CacheFirst`.
  - API GET (read-models): `NetworkFirst` с TTL 60 сек, fallback на cache.
  - API POST/PATCH/DELETE: `NetworkOnly` + outbox-queue для master-app.

#### 7.8.1 Master-app offline workflow

Сценарий: мастер в боксе, плохая связь.

1. Master-app кэширует список своих активных нарядов и клиентов в IndexedDB (через `idb` библиотеку).
2. Мастер открывает наряд — всё доступно из кэша.
3. Загружает фото — фото сохраняется в IndexedDB как Blob, помечается `pendingUpload: true`.
4. Добавляет строку расхода — изменения сохраняются локально в IndexedDB как «pending mutation».
5. Когда сеть восстанавливается — Background Sync API триггерит загрузку pending фото и применение pending mutations.
6. После успешной синхронизации — UI обновляется свежими данными с сервера.

```ts
// libs/frontend/shared/pwa/src/lib/sync-queue.service.ts
@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  async enqueueMutation(mutation: PendingMutation): Promise<void> {
    await idb.add('mutations', mutation);
    await registerBackgroundSync('sync-mutations');
  }

  async processQueue(): Promise<void> {
    const pending = await idb.getAll('mutations');
    for (const m of pending) {
      try {
        await this.api.execute(m);
        await idb.delete('mutations', m.id);
      } catch (e) {
        if (isConflict(e)) await this.resolveConflict(m, e);
      }
    }
  }
}
```

**Конфликты:** при попытке отправить устаревшую mutation (другой мастер уже изменил наряд) — UI показывает диалог «Изменения не синхронизированы, обновить и попробовать снова?».

#### 7.8.2 Web Push

- VAPID ключи генерируются разово, хранятся в env.
- Клиент подписывается через Service Worker `pushManager.subscribe(...)`.
- Subscription отправляется в API (`POST /me/push-subscriptions`).
- Backend отправляет push через `web-push` npm-пакет.

### 7.9 i18n

- В MVP — только RU.
- Всё через `@ngx-translate/core` или Angular i18n (на этапе bootstrap решаем по результатам POC).
- Все строки UI вынесены в `libs/frontend/shared/i18n/src/lib/ru.json`.
- Pluralization — через ICU MessageFormat.

### 7.10 Конфигурация и environments

- `apps/<app>/src/environments/environment.ts` — dev (defaults).
- `apps/<app>/src/environments/environment.prod.ts` — prod build (через fileReplacements в angular.json).
- Runtime config: при старте app загружает `/assets/runtime-config.json`, который генерируется при деплое (содержит `apiBaseUrl`, `yandexClientId`, `telegramBotName`).

---

## 8. Интеграции

### 8.1 ЮKassa (заглушка для биллинга, реально для оплаты — Phase 2)

**MVP:**
- Тарифы и подписка симулируются.
- Кнопка «Оплатить картой» открывает модалку «В разработке».
- В коде — `IPaymentProviderPort` с реализацией `MockPaymentProviderAdapter`, возвращающей фейковые `paymentId`.

**Phase 2:**
- Реализация `YooKassaPaymentProviderAdapter` через REST API ЮKassa.
- Webhook на `/webhooks/yookassa` для обработки событий `payment.succeeded`, `payment.canceled`.
- Recurring-платежи через сохранённые платёжные методы.

### 8.2 SMS-провайдер

**Выбор:** SMS.ru (или SMSC) — российский провайдер, хорошие цены.

```ts
// libs/backend/notifications/infrastructure/src/lib/adapters/sms-ru.adapter.ts
@Injectable()
export class SmsRuAdapter implements ISmsSender {
  async send(phone: string, text: string): Promise<SendResult> {
    const response = await this.http.post('https://sms.ru/sms/send', {
      api_id: this.config.apiKey,
      to: phone,
      msg: text,
      json: 1,
      from: this.config.senderName,
    });
    if (response.data.status === 'OK') {
      return { ok: true, providerId: response.data.sms[phone].sms_id, cost: response.data.sms[phone].cost };
    }
    return { ok: false, error: response.data.status_text };
  }
}
```

**Использование:**
- OTP-коды (5 минут TTL, лимит 3 сообщения в час на номер).
- Уведомления о записи (короткий текст).
- Напоминания.

**Резервный канал:** при недоступности SMS.ru — fallback на email + Telegram (если привязан).

### 8.3 Email

**MVP:** SMTP через стандартный nodemailer-адаптер. Конкретный провайдер — Yandex SMTP / SendPulse (выбирается на этапе деплоя).

```ts
@Injectable()
export class SmtpEmailAdapter implements IEmailSender {
  async send(props: EmailProps): Promise<SendResult> {
    const result = await this.transporter.sendMail({
      from: this.config.from,
      to: props.to,
      subject: props.subject,
      html: props.html,
      text: props.text,
      attachments: props.attachments,
    });
    return { ok: true, providerId: result.messageId };
  }
}
```

**Шаблоны** — Handlebars-партиалы в `libs/backend/notifications/infrastructure/src/lib/templates/`. Генерация HTML через MJML (для адаптивности).

### 8.4 Telegram-бот

**Реализация:** Telegraf, в одном процессе с API (отдельный модуль Nest).

```ts
// libs/backend/notifications/infrastructure/src/lib/adapters/telegram-bot.module.ts
@Module({})
export class TelegramBotModule {
  static forRoot(): DynamicModule {
    return {
      module: TelegramBotModule,
      providers: [
        {
          provide: 'TELEGRAM_BOT',
          useFactory: (config: ConfigService) => {
            const bot = new Telegraf(config.get('TELEGRAM_BOT_TOKEN'));
            bot.start((ctx) => ctx.reply('Привет! ...'));
            bot.command('link', linkAccountHandler);
            bot.action(/confirm:(.+)/, confirmAppointmentHandler);
            bot.launch({ webhook: { domain: config.get('PUBLIC_HOST'), port: 3001 } });
            return bot;
          },
          inject: [ConfigService],
        },
      ],
      exports: ['TELEGRAM_BOT'],
    };
  }
}
```

**Связывание Telegram-аккаунта с пользователем:**
1. В клиентском приложении пользователь жмёт «Подключить Telegram».
2. Открывается Telegram с ботом и одноразовым deep-link `t.me/<bot>?start=<token>`.
3. Бот видит токен, идёт в API `/me/telegram/link?token=...`, маппит `chatId` ↔ `userId`.

**Telegram Login Widget** для авторизации:
- На лендинге client-app — кнопка «Войти через Telegram».
- Telegram возвращает signed payload с пользовательскими данными.
- Backend проверяет подпись, ищет/создаёт User, выдаёт JWT.

### 8.5 OAuth: Яндекс ID

- Регистрируем приложение на oauth.yandex.ru.
- Используем `@nestjs/passport` + `passport-yandex` (или собственная реализация — стратегия простая).
- Scopes: `login:email`, `login:info`.
- Flow: authorization code → token exchange → fetch profile → match by email/phone → issue our JWT.

### 8.6 MinIO / S3

```ts
@Injectable()
export class MinioPhotoStorageAdapter implements IPhotoStoragePort {
  async upload(file: UploadedFile): Promise<PhotoStorageResult> {
    const id = uuidv4();
    const key = `work-orders/${file.workOrderId}/${id}.${ext(file.mimeType)}`;
    
    // Сжатие и thumbnail через sharp
    const compressed = await sharp(file.buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const thumbnail = await sharp(file.buffer)
      .resize({ width: 200, height: 200, fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    await this.client.putObject(BUCKET, key, compressed, compressed.length, { 'content-type': 'image/jpeg' });
    await this.client.putObject(BUCKET, `${key}.thumb.jpg`, thumbnail, thumbnail.length, { 'content-type': 'image/jpeg' });

    return {
      id,
      url: this.publicUrl(key),
      thumbnailUrl: this.publicUrl(`${key}.thumb.jpg`),
      mime: 'image/jpeg',
      sizeBytes: compressed.length,
    };
  }
}
```

**Бакеты:**
- `detailing-photos` — фото нарядов (public-read через nginx с подписанными URL? — в MVP public-read).
- `detailing-attachments` — накладные поставщиков (private, доступ только через signed URL из API).
- `detailing-backups` — pg_dump архивы (private, retention 30 дней).

---

## 9. Безопасность и авторизация

### 9.1 Аутентификация

- Уже описано в FR-5.1 и API §4.5.
- Хранение паролей: bcrypt cost 12.
- TOTP-секреты в БД — шифрование AES-256-GCM с ключом из env (`TOTP_ENCRYPTION_KEY`).
- Refresh-токены: хранится только хэш; ротация при каждом refresh.

### 9.2 JWT

- Алгоритм: HS256 (для MVP); RS256 — Phase 2.
- Access TTL: 15 минут.
- Refresh TTL: 30 дней.
- Claims:
  ```json
  {
    "sub": "<userId>",
    "roles": ["OWNER"],
    "branches": ["uuid1", "uuid2"],
    "iat": ..., "exp": ...
  }
  ```
- Секрет: `JWT_SECRET` в env, минимум 256 бит.

### 9.3 Авторизация (CASL)

Используем библиотеку **CASL** для декларативной авторизации (RBAC + ABAC):

```ts
// libs/backend/iam/application/src/lib/abilities/ability.factory.ts
@Injectable()
export class AbilityFactory {
  createForUser(user: AuthenticatedUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.roles.includes('OWNER')) {
      can('manage', 'all');
    }
    if (user.roles.includes('MANAGER')) {
      can('manage', 'Appointment');
      can('manage', 'Client');
      can('manage', 'WorkOrder', { branchId: { $in: user.branches } });
      can('manage', 'Sku');
      cannot('view', 'Sku', ['cost', 'averageCost']); // менеджер не видит закупочные цены
      cannot('manage', 'Service');
      cannot('view', 'Subscription', ['invoices']);
    }
    if (user.roles.includes('MASTER')) {
      can('view', 'Appointment', { masterUserId: user.id });
      can('manage', 'WorkOrder', { masterUserId: user.id });
      can('view', 'Client', { id: { $in: user.assignedClientIds() } });
    }
    if (user.roles.includes('CLIENT')) {
      can('view', 'Appointment', { clientId: user.id });
      can('manage', 'Vehicle', { clientId: user.id });
      // ...
    }

    return build({ detectSubjectType: subjectFromInstance });
  }
}
```

```ts
// контроллер
@Controller('appointments')
export class AppointmentController {
  @Post(':id/cancel')
  @CheckAbility((ability, ctx) => ability.can('cancel', { __type: 'Appointment', id: ctx.params.id }))
  async cancel(@Param('id') id: string) { /* ... */ }
}
```

### 9.4 152-ФЗ (защита персональных данных)

#### 9.4.1 Правовые требования

- **Регистрация в Реестре операторов ПДн** Роскомнадзора — обязанность владельца студии (вне продукта; в документации указываем).
- **Хранение ПДн на серверах в РФ.** Деплой — Yandex Cloud / Selectel / VK Cloud.
- **Документ «Политика обработки ПДн»** — обязателен на сайте, ссылка с формы регистрации.

#### 9.4.2 Технические меры

- Явное согласие на обработку ПДн при регистрации клиента (не предзаполненный чекбокс).
- Отдельное согласие на маркетинговые рассылки.
- Логирование доступа к ПДн (`audit_log` с типом `PII_ACCESS`).
- Шифрование at-rest: для критичных полей (телефон, email) — pgcrypto column-level encryption на Phase 2; в MVP — TLS на канале + database TLS.
- Право на доступ: endpoint `GET /clients/:id/data-export` возвращает JSON со всеми ПДн клиента.
- Право на удаление: процедура анонимизации с удалением полей `full_name`, `phone`, `email`, `birth_date` и заменой на стабильные плейсхолдеры (`ANONYMIZED_<id>`).
- Хранение согласий: таблица `crm_consent` с `given_at`, `revoked_at`, `version_of_policy`.

#### 9.4.3 Журнал доступа к ПДн

```sql
CREATE TABLE pii_access_log (
  id UUID PRIMARY KEY,
  actor_user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  operation TEXT NOT NULL, -- VIEW | EXPORT | UPDATE | DELETE
  fields TEXT[],
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip INET,
  user_agent TEXT
);
```

Запись создаётся в interceptor'е при доступе к `Client` aggregate.

### 9.5 Защита от типичных атак

| Атака | Мера |
|---|---|
| XSS | Angular авто-экранирование + CSP `default-src 'self'` |
| CSRF | SameSite=Strict для refresh-cookie + проверка Origin для не-GET |
| SQL Injection | Только параметризованные запросы через MikroORM |
| SSRF | Allowlist для исходящих HTTP в адаптерах |
| Brute force на логин | Rate limit 5 попыток / 15 мин на IP+email; блокировка аккаунта |
| Credential stuffing | OTP + 2FA для критичных ролей |
| OTP brute force | 3 попытки на код, после — invalidate; 5 запросов кода в час на телефон |
| Insecure direct object reference | CASL-проверка на каждом ресурсе |
| Session fixation | Ротация refresh-токена при каждом refresh |
| File upload (malware, oversize) | Проверка magic bytes, MAX_SIZE 10 МБ, sharp re-encoding |
| ReDoS | Не использовать catastrophic regex; lint правила |
| Open redirects | Whitelist для OAuth `redirectUri` |

### 9.6 Rate limiting

- `express-rate-limit` (или `@nestjs/throttler`) на основе Redis.
- Лимиты по умолчанию:
  - Public anonymous: 60 req/min/IP.
  - Authenticated: 600 req/min/user.
  - OTP request: 5 req/hour/phone, 20 req/hour/IP.
  - Login attempt: 10 req/15min/IP, 5 req/15min/email.
  - Photo upload: 30 req/min/user.

### 9.7 Хранение секретов

- MVP: `.env` файл, не коммитится в git, `.env.example` коммитится с примерами.
- Production: docker secrets / Vault / Yandex Lockbox / KMS — Phase 2.
- В коде секреты доступны только через `ConfigService`.

### 9.8 Аудит

Логируется в `audit_log`:
- Логин (success/fail), logout.
- Изменение ролей, активация/деактивация пользователя.
- Изменение цены услуги.
- Корректировки склада > порога (с указанием суммы).
- Удаление/анонимизация клиента.
- Закрытие наряда менеджером без мастера.
- Запросы на доступ к ПДн (в pii_access_log).
- Изменения в графике работы филиала и мастеров.

Audit-лог не редактируется и не удаляется. Retention: минимум 1 год; для PII-доступа — 3 года.

---

## 10. Observability

### 10.1 Логирование

- **Библиотека:** Pino (быстрая, structured JSON).
- **Уровни:** `error`, `warn`, `info`, `debug`. В production — info+.
- **Формат:**
  ```json
  {
    "level": "info",
    "time": "2026-05-03T18:00:00.000Z",
    "service": "api",
    "context": "WorkOrderController",
    "msg": "Work order closed",
    "requestId": "abc-123",
    "userId": "...",
    "workOrderId": "...",
    "durationMs": 142
  }
  ```
- **PII маскирование:**
  - phone: `+7***1234`
  - email: `e***@example.com`
  - full_name: `И*** И*** И***`
- Pino redact paths настраиваются глобально.

### 10.2 Correlation ID

- Каждый HTTP-запрос получает `X-Request-Id` (генерируется, если не пришёл).
- ID пробрасывается через все логи, доменные события (как `correlationId` в metadata), интеграционные вызовы.
- Frontend генерирует ID для каждого запроса, пробрасывает в заголовке.

### 10.3 Метрики

- **MVP:** базовые Prometheus метрики через `prom-client`:
  - http_requests_total{method, route, status}
  - http_request_duration_seconds{method, route} (histogram)
  - notifications_sent_total{channel, status}
  - bullmq_queue_size{queue}
  - outbox_unpublished_count
- Endpoint `/metrics` — protected, доступен только из cluster network (или basic auth).

**Phase 2:** интеграция с Grafana + Prometheus + Loki.

### 10.4 Трейсинг

- **MVP:** OpenTelemetry SDK инструментирует Nest middleware и MikroORM (опц., если успеваем).
- **Экспорт:** OTLP в Jaeger (локально) / Yandex Tracing (prod).
- **Phase 2:** полная инструментация всех адаптеров.

### 10.5 Health checks

```
GET /health/live   → 200 если процесс жив
GET /health/ready  → 200 если БД, Redis, MinIO доступны; 503 иначе
```

Используется `@nestjs/terminus`.

### 10.6 Audit log как отчёт

- В админке OWNER: раздел «Безопасность → Аудит» — таблица событий с фильтрами.
- Экспорт в CSV для compliance-аудита.

### 10.7 Алертинг (Phase 2)

- Pingdom / Uptime Robot на public health-check.
- Sentry для frontend-ошибок (или встроенный в Pino backend).

---

## 11. Инфраструктура

### 11.1 Docker Compose (single command deploy)

```yaml
# docker-compose.yml (упрощённый)
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: detailing
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - miniodata:/data
    ports:
      - "9001:9001"

  minio-init:
    image: minio/mc
    depends_on: { minio: { condition: service_healthy } }
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 $$MINIO_ROOT_USER $$MINIO_ROOT_PASSWORD;
      mc mb -p local/detailing-photos local/detailing-attachments local/detailing-backups || true;
      mc anonymous set download local/detailing-photos;
      "

  api:
    build:
      context: .
      dockerfile: ./apps/backend/api/Dockerfile
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      minio: { condition: service_started }
    environment:
      DATABASE_URL: postgres://app:${POSTGRES_PASSWORD}@postgres:5432/detailing
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      SMS_RU_API_KEY: ${SMS_RU_API_KEY}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      YANDEX_ID_CLIENT_ID: ${YANDEX_ID_CLIENT_ID}
      YANDEX_ID_CLIENT_SECRET: ${YANDEX_ID_CLIENT_SECRET}
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      PUBLIC_HOST: ${PUBLIC_HOST}

  worker:
    build:
      context: .
      dockerfile: ./apps/backend/api/Dockerfile
    command: ["node", "dist/apps/backend/api/main.js", "--worker"]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    environment:
      # ...то же, что api
      WORKER_MODE: "true"

  scheduler:
    build:
      context: .
      dockerfile: ./apps/backend/api/Dockerfile
    command: ["node", "dist/apps/backend/api/main.js", "--scheduler"]
    depends_on: { redis: { condition: service_healthy } }
    environment: # ...

  admin:
    build:
      context: .
      dockerfile: ./apps/frontend/admin/Dockerfile
    environment:
      API_BASE_URL: ${PUBLIC_API_URL}

  client:
    build:
      context: .
      dockerfile: ./apps/frontend/client/Dockerfile

  master:
    build:
      context: .
      dockerfile: ./apps/frontend/master/Dockerfile

  nginx:
    image: nginx:1.27-alpine
    depends_on: [api, admin, client, master]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infra/nginx/certs:/etc/nginx/certs:ro

volumes:
  pgdata:
  redisdata:
  miniodata:
```

### 11.2 nginx как обратный прокси и раздача SPA

```nginx
# infra/nginx/nginx.conf
events {}
http {
  upstream api { server api:3000; }

  server {
    listen 443 ssl http2;
    server_name admin.detailing.example;
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location /api/ {
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $host;
    }

    location /ws/ {
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }

    location / {
      root /usr/share/nginx/admin;
      try_files $uri $uri/ /index.html;
    }
  }

  # client.detailing.example — аналогично, root → client
  # master.detailing.example — аналогично, root → master
}
```

### 11.3 Переменные окружения

`.env.example` коммитится в репозиторий с описанием каждой переменной:

```bash
# Database
POSTGRES_PASSWORD=changeme

# Redis
REDIS_PASSWORD=changeme

# MinIO
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=changeme

# JWT
JWT_SECRET=<generate with `openssl rand -base64 32`>

# SMS
SMS_RU_API_KEY=

# SMTP
SMTP_HOST=smtp.yandex.ru
SMTP_USER=
SMTP_PASSWORD=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_NAME=

# OAuth
YANDEX_ID_CLIENT_ID=
YANDEX_ID_CLIENT_SECRET=

# Push
VAPID_PUBLIC_KEY=<generate with `npx web-push generate-vapid-keys`>
VAPID_PRIVATE_KEY=

# Public URLs (для CORS, OAuth callback и т.п.)
PUBLIC_HOST=detailing.example
PUBLIC_API_URL=https://detailing.example/api/v1
```

### 11.4 Команды для разработки

```bash
# Установка
pnpm install

# Запуск всего стека
docker-compose up -d
pnpm nx run-many --target=serve --projects=admin,client,master,api

# Только бэкенд
pnpm nx serve api

# Миграции
pnpm nx run api:migration:create --name=initial
pnpm nx run api:migration:up

# Сидинг (демо-данные)
pnpm nx run api:seed

# Тесты
pnpm nx run-many --target=test --all
pnpm nx run-many --target=e2e --projects=admin-e2e,client-e2e,master-e2e
```

### 11.5 Бэкапы

- **PostgreSQL:** ежедневный `pg_dump` через cron-контейнер в MinIO bucket `detailing-backups`. Retention: 30 дней.
- **MinIO:** для `detailing-photos` — реплика на другой volume / S3 (Phase 2). Для MVP — RAID на хосте.
- **Скрипт восстановления:** `infra/scripts/restore.sh` принимает дату бэкапа, восстанавливает БД из dump и фото из MinIO snapshot.

### 11.6 Production deployment (out of MVP)

В MVP — `docker-compose up` на одной VM с публичным доменом. Для production-грейд деплоя на Phase 2:

- Инфраструктура: Kubernetes / Yandex Managed Kubernetes / Selectel.
- БД: Managed PostgreSQL.
- Redis: Managed Redis или собственный с persistence.
- MinIO → Yandex Object Storage / Selectel S3.
- Secrets: Yandex Lockbox / Vault.
- Логи: Yandex Cloud Logging / Loki.
- Метрики: Managed Prometheus.

---

## 12. CI/CD

### 12.1 GitHub Actions: pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push: { branches: [main, develop] }
  pull_request: { branches: [main, develop] }

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      affected_apps: ${{ steps.affected.outputs.apps }}
      affected_libs: ${{ steps.affected.outputs.libs }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - id: affected
        uses: nrwl/nx-set-shas@v4

  lint:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx affected --target=lint --parallel=3

  typecheck:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - # ...
      - run: pnpm nx affected --target=typecheck --parallel=3

  test-unit:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - # ...
      - run: pnpm nx affected --target=test --parallel=3

  test-integration:
    needs: setup
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: test }
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - # ...
      - run: pnpm nx run api:migration:up
      - run: pnpm nx run api:test-integration

  build:
    needs: [lint, typecheck, test-unit]
    runs-on: ubuntu-latest
    steps:
      - # ...
      - run: pnpm nx affected --target=build --parallel=3 --configuration=production
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - # ...
      - run: docker-compose -f docker-compose.test.yml up -d
      - run: pnpm nx run-many --target=e2e --projects=admin-e2e,client-e2e,master-e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report/ }

  docker-publish:
    if: github.ref == 'refs/heads/main'
    needs: [build, e2e]
    runs-on: ubuntu-latest
    steps:
      - # ...
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - run: |
          docker buildx bake -f docker-bake.hcl --push \
            --set *.tags=ghcr.io/${{ github.repository }}/api:${{ github.sha }} \
            --set *.tags=ghcr.io/${{ github.repository }}/api:latest

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: docker-publish
    runs-on: ubuntu-latest
    steps:
      - # SSH в production VM, docker-compose pull && up -d
```

### 12.2 Кеширование и affected

- Nx Cloud (или self-hosted Nx cache) для распределённого кэша.
- `nx affected` — запускает только задачи для изменённых проектов.
- В CI используется `nrwl/nx-set-shas` для определения базы сравнения.

### 12.3 Релизы и версионирование

- **Semantic versioning** для приложений (через Nx versioning или changesets).
- Тег `vX.Y.Z` создаётся вручную после релиз-кандидата.
- Changelog генерируется из commit messages (Conventional Commits).
- Каждый PR проходит:
  1. Все CI-этапы (lint, typecheck, test, e2e).
  2. Code review (минимум 1 одобрение).
  3. Только после этого merge в main.

### 12.4 Защита веток

- `main` — protected, no force push, требует CI green + 1 review.
- `develop` — protected, no force push, требует CI green.
- Feature branches → PR в `develop` → периодический merge `develop` → `main` (релизный).

---

## 13. Стратегия тестирования

### 13.1 Пирамида тестов

```
          ▲
         /e\           E2E (~ 10%)
        /---\
       /int. \         Integration (~ 20%)
      /-------\
     / unit    \       Unit (~ 70%)
    /───────────\
```

### 13.2 Unit-тесты доменного слоя

- **Цель покрытия:** ≥ 85%.
- **Технология:** Jest.
- **Принципы:**
  - Тестируется поведение агрегатов (методы и инварианты).
  - **Никаких моков** в domain-тестах. Зависимости агрегата — это другие domain-объекты или VO; mock не нужен.
  - Тесты быстрые: один тест ≤ 1 мс.

```ts
// libs/backend/work-order/domain/src/lib/work-order.aggregate.spec.ts
describe('WorkOrder.close', () => {
  it('throws if no before photos', () => {
    const wo = WorkOrder.openFromAppointment(/* ... */);
    expect(() => wo.close()).toThrow(MissingBeforePhotoError);
  });

  it('throws if any line has |deviation| > 15% without reason', () => {
    const wo = createCloseableWorkOrder();
    wo.addConsumption({ skuId, actualAmount: 100, normAmount: 50 }); // +100% deviation
    expect(() => wo.close()).toThrow(DeviationReasonRequiredError);
  });

  it('emits WorkOrderClosed event with consumption summary', () => {
    const wo = createCloseableWorkOrder();
    wo.close();
    const events = wo.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(WorkOrderClosed);
  });
});
```

### 13.3 Integration-тесты (application layer)

- **Технология:** Jest + Testcontainers (Postgres + Redis).
- **Цель покрытия:** все command handlers и query handlers.
- **Принципы:**
  - Поднимается реальная БД, миграции применяются.
  - Команды выполняются полностью (включая outbox).
  - Внешние адаптеры (SMS, Telegram, ЮKassa) — мокаются.

```ts
describe('CreateAppointmentHandler', () => {
  let handler: CreateAppointmentHandler;
  let em: EntityManager;

  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withDatabase('postgres')
      .withRedis()
      .withModule(SchedulingInfrastructureModule)
      .build();
    handler = module.get(CreateAppointmentHandler);
    em = module.get(EntityManager);
  });

  it('creates confirmed appointment when slot is free', async () => {
    await seedClient(em, { id: 'client-1' });
    await seedMaster(em, { id: 'master-1' });
    await seedService(em, { id: 'service-1', duration: 60 });

    const appointmentId = await handler.execute(new CreateAppointmentCommand({
      clientId: 'client-1', masterId: 'master-1', serviceIds: ['service-1'],
      slot: { start: '2026-05-10T10:00:00Z', end: '2026-05-10T11:00:00Z' },
    }));

    const stored = await em.findOne(AppointmentSchema, { id: appointmentId });
    expect(stored?.status).toBe('CONFIRMED');

    const outboxRows = await em.find(OutboxEventSchema, { aggregateId: appointmentId });
    expect(outboxRows).toContainEqual(expect.objectContaining({ eventType: 'AppointmentCreated' }));
  });
});
```

### 13.4 E2E-тесты

- **Технология:** Playwright (TypeScript).
- **Сценарии MVP (критические пути):**
  1. **Клиент записывается онлайн.** Открыть client-app → выбрать услугу → выбрать слот → подтвердить OTP → увидеть подтверждение записи.
  2. **Менеджер создаёт приход.** Логин → склад → приход → добавить позиции → провести → проверить остаток.
  3. **Мастер выполняет наряд.** Логин → принять авто → загрузить фото «до» → добавить расход → загрузить фото «после» → закрыть наряд.
  4. **Клиент отменяет запись.** Логин → мои записи → отменить (за >24ч) → проверить статус.
  5. **Владелец смотрит отчёт.** Логин → отчёт «движения» → фильтры → экспорт CSV.
- E2E запускаются в CI после успешного build.

### 13.5 Тестовые данные

- Seed-скрипт `apps/backend/api/src/seed.ts` создаёт демо-окружение:
  - 1 OWNER, 2 MANAGER, 4 MASTER, 20 CLIENT.
  - 2 филиала, 6 боксов.
  - 30 SKU, 5 поставщиков, 100 партий с движениями.
  - 50 услуг в 5 категориях.
  - 200 записей за прошлые 30 дней (различные статусы).
- Запускается через `pnpm nx run api:seed`.

### 13.6 Контрактное тестирование интеграций

- Внешние адаптеры (SMS.ru, ЮKassa) — реальные интеграции тестируются вручную в staging.
- **Phase 2:** Pact для контрактов адаптеров.

### 13.7 Покрытие

- Целевое покрытие unit-тестами:
  - `domain/`: ≥ 85%.
  - `application/`: ≥ 75%.
  - `infrastructure/`: ≥ 60% (через integration).
- Reports публикуются в CI как артефакты.

### 13.8 Performance тесты (Phase 2)

- k6 / Artillery для сценариев онлайн-записи.
- Нагрузочное тестирование выполняется вручную перед публичным запуском.

---

## 14. ADR (Architecture Decision Records)

Все важные архитектурные решения фиксируются как ADR в `docs/engineering/adr/`. Формат — Markdown по шаблону Michael Nygard:

```markdown
# ADR-NNN. Заголовок решения

**Status:** Accepted | Proposed | Deprecated | Superseded by ADR-MMM
**Date:** YYYY-MM-DD
**Deciders:** @user1, @user2

## Context
Что нас привело к необходимости решения, какие ограничения и факторы.

## Decision
Какое решение приняли, кратко и однозначно.

## Consequences
Что мы получаем (плюсы) и что теряем (минусы), какие компромиссы.

## Alternatives considered
Какие альтернативы рассматривали и почему отвергли.
```

### 14.1 Список ADR на старт проекта

| ID | Заголовок | Статус |
|---|---|---|
| ADR-001 | MikroORM как ORM | Accepted |
| ADR-002 | In-process domain events с outbox-паттерном | Accepted |
| ADR-003 | Один docker-compose для MVP | Accepted |
| ADR-004 | CQRS-light: read через Query Services без отдельной БД | Accepted |
| ADR-005 | Без NgRx и TanStack Query: только Angular Signals + сервисы | Accepted |
| ADR-006 | REST + OpenAPI вместо GraphQL/tRPC | Accepted |
| ADR-007 | Telegraf-бот в одном процессе с API | Accepted |
| ADR-008 | PWA только для master и client | Accepted |
| ADR-009 | Хранение ПДн в РФ (152-ФЗ) | Accepted |
| ADR-010 | Гостевая запись через одноразовый OTP без пароля | Accepted |
| ADR-011 | Средневзвешенная себестоимость (не FIFO/LIFO для cost) | Accepted |
| ADR-012 | FEFO/FIFO выбор партии при списании | Accepted |
| ADR-013 | Single-tenant архитектура с подготовкой к multi-tenant | Accepted |
| ADR-014 | Branding: Taiga UI владеет цветом, Tailwind — layout | Accepted |
| ADR-015 | CASL для авторизации (RBAC + ABAC) | Accepted |

### 14.2 Пример ADR-001

```markdown
# ADR-001. MikroORM как ORM

**Status:** Accepted
**Date:** 2026-05-03
**Deciders:** Команда

## Context

Нам нужен ORM для NestJS-бэкенда, который не противоречит DDD-подходу. В DDD доменная модель должна быть свободна от инфраструктурных зависимостей. Мы держим раздельные классы для Domain (`Aggregate`, `Entity`) и Persistence (`Schema`), между ними — Mapper. ORM используется только в инфраструктурном слое.

Кандидаты:
- TypeORM — самый популярный в экосистеме Nest, поддерживает Data Mapper, но Identity Map и Unit of Work реализованы частично, нет нативной поддержки агрегатных корней.
- Prisma — «батарейки включены», but row-based: каждый save — отдельный запрос. Нет Identity Map, нет Unit of Work. Генерирует свои типы — это создаёт соблазн использовать сгенерированную модель как domain (антипаттерн, anemic model).
- MikroORM — настоящий Unit of Work и Identity Map (как Doctrine/Hibernate), нативная поддержка Data Mapper, поддержка событий жизненного цикла.

## Decision

Используем **MikroORM** как ORM на бэкенде.

## Consequences

**Плюсы:**
- Один EntityManager.fork per request → identity map работает корректно: один и тот же агрегат внутри запроса — одна и та же ссылка.
- Транзакции через `em.transactional()` — идиоматично DDD.
- Поддержка PG-специфичных типов (jsonb, array, enum, citext).
- Миграции из коробки.
- Лёгкая интеграция с NestJS (`MikroOrmModule.forFeature`).

**Минусы:**
- Меньше популярности в экосистеме Nest, чем TypeORM, → меньше StackOverflow ответов.
- Команда могла раньше работать с TypeORM/Prisma, нужно время на онбординг.
- Maintenance — у MikroORM один основной мейнтейнер; есть риск стагнации (мониторим).

## Alternatives considered

- **TypeORM**: отвергнут из-за частичной реализации UoW и нестабильности API в последние мажорные версии.
- **Prisma**: отвергнут, потому что row-based и принципиально не подходит для Repository pattern с агрегатами; в DDD-проекте создаёт давление на использование сгенерированных типов как domain-моделей.
- **Drizzle**: рассматривался; query builder, без Identity Map. Хорош для read-моделей, но не для transactional aggregates.
- **Knex.js + ручные репозитории**: слишком много boilerplate.
```

---

## Приложение А. Дерево репозитория

```
detailing-studio/
├── apps/
│   ├── backend/                                 # platform:node
│   │   └── api/                                 # NestJS — тонкий bootstrap-слой
│   │       ├── src/
│   │       │   ├── main.ts
│   │       │   ├── app/
│   │       │   │   └── app.module.ts            # импортирует <Ctx>InfrastructureModule + <Ctx>InterfacesModule
│   │       │   ├── config/                      # ConfigModule.registerAs(...) фабрики
│   │       │   ├── health/                      # /api/health
│   │       │   ├── migrations/                  # MikroORM миграции
│   │       │   └── seed.ts
│   │       ├── Dockerfile
│   │       ├── mikro-orm.config.ts
│   │       └── project.json                     # tags: ["scope:shared", "type:app", "platform:node"]
│   │   # Никакого доменного / прикладного кода в apps/backend/api/src/ нет.
│   │
│   ├── frontend/                                # platform:angular
│   │   ├── admin/                               # Angular SPA   (OWNER, MANAGER)
│   │   ├── admin-e2e/                           # Playwright
│   │   ├── master/                              # Angular PWA   (MASTER)
│   │   ├── master-e2e/
│   │   ├── client/                              # Angular PWA   (CLIENT)
│   │   └── client-e2e/
│   │
│   ├── mobile/                                  # 📦 placeholder (Capacitor / Flutter / RN)
│   │   └── README.md
│   └── desktop/                                 # 📦 placeholder (Tauri / Electron)
│       └── README.md
│
├── libs/
│   ├── shared/                                  # platform:any — общее для FE и BE (только pure TS)
│   │   ├── contracts/                           # OpenAPI/DTO, генерируется из BE
│   │   ├── types/                               # Brand-типы ID (UserId, AppointmentId, ...)
│   │   └── util-pure/                           # Money, DateTime, RU phone validator
│   │
│   ├── backend/                                 # platform:node
│   │   ├── shared/
│   │   │   ├── ddd/                             # AggregateRoot, Entity, VO, DomainEvent
│   │   │   ├── outbox/                          # Outbox schema + Service + Poller
│   │   │   ├── auth/                            # AuthGuard, CASL infra, JWT helpers
│   │   │   ├── http/                            # GlobalExceptionFilter, ProblemDetails
│   │   │   └── testing/                         # TestModuleBuilder, fixtures
│   │   ├── iam/                                 # bounded context на бэке
│   │   │   ├── domain/                          # Nx lib  (scope:iam, type:domain, platform:node)
│   │   │   ├── application/                     # Nx lib  (scope:iam, type:application, platform:node)
│   │   │   ├── infrastructure/                  # Nx lib  (scope:iam, type:infrastructure, platform:node)
│   │   │   └── interfaces/                      # Nx lib  (scope:iam, type:interfaces, platform:node)
│   │   ├── catalog/                             # та же 4-слойная структура
│   │   ├── inventory/
│   │   ├── crm/
│   │   ├── scheduling/
│   │   ├── work-order/
│   │   ├── notifications/
│   │   └── billing/
│   │
│   ├── frontend/                                # platform:angular
│   │   ├── shared/
│   │   │   ├── ui/                              # Taiga-обёртки + Tailwind токены
│   │   │   ├── ui-layout/
│   │   │   ├── data-access/                     # base http-клиент, interceptors
│   │   │   ├── auth/                            # AuthService, AuthGuard (Angular)
│   │   │   ├── i18n/
│   │   │   └── pwa/                             # SW, offline queue
│   │   ├── iam/                                 # bounded context на фронте
│   │   │   ├── data-access/                     # signal-store + http-репозиторий
│   │   │   ├── feature-login/
│   │   │   ├── feature-otp/
│   │   │   └── feature-oauth-callback/
│   │   ├── catalog/, inventory/, crm/, scheduling/, work-order/   # аналогично
│   │   └── ...
│   │
│   ├── mobile/                                  # 📦 placeholder (libs)
│   └── desktop/                                 # 📦 placeholder (libs)
│
├── infra/
│   ├── nginx/
│   ├── scripts/
│   └── docker/
├── docs/
│   ├── product.md              # Продуктовое ТЗ
│   ├── engineering.md          # Этот документ
│   └── adr/
│       ├── ADR-001.md
│       └── ...
├── .github/
│   └── workflows/
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json          # paths: @det/shared/*, @det/backend/*, @det/frontend/*
├── README.md
└── CONTRIBUTING.md
```

---

## Приложение Б. Сценарий «End-to-End: онлайн-запись и закрытие наряда» (sequence)

```mermaid
sequenceDiagram
  autonumber
  participant C as Клиент (client-app)
  participant FE as Frontend
  participant API as API (NestJS)
  participant DB as PostgreSQL
  participant OB as Outbox
  participant Q as BullMQ
  participant SMS as SMS-провайдер
  participant TG as Telegram
  participant M as Мастер (master-app)

  C->>FE: выбирает услуги, слот, вводит телефон
  FE->>API: POST /auth/login/otp/request
  API->>SMS: send OTP
  C->>FE: вводит OTP
  FE->>API: POST /auth/login/otp/verify
  API-->>FE: JWT
  FE->>API: POST /appointments {services, slot, vehicle}
  API->>DB: BEGIN
  API->>DB: insert Client (если нет)
  API->>DB: insert Vehicle (если нет)
  API->>DB: insert Appointment (CONFIRMED)
  API->>OB: append AppointmentCreated, ClientRegistered, ClientVehicleAdded
  API->>DB: COMMIT
  API-->>FE: 201 + appointmentId
  FE-->>C: «Запись подтверждена»

  Note over OB,Q: Outbox poller (~ 1s)
  OB->>Q: enqueue AppointmentCreated
  Q->>API: handler: NotifyClientOnAppointmentCreated
  API->>SMS: send confirmation
  Q->>API: handler: NotifyManagerOnAppointmentCreated
  API->>TG: post in studio chat

  Note over C,M: 24h later — reminder
  Q->>API: scheduled job
  API->>SMS: send reminder
  API->>TG: send to client (если linked)

  Note over C,M: В день записи
  M->>FE (master): открывает «Сегодня»
  FE->>API: GET /appointments/today
  M->>FE: жмёт «Принять авто»
  FE->>API: POST /appointments/:id/start
  API->>DB: BEGIN
  API->>DB: appointment.status = IN_PROGRESS
  API->>DB: insert WorkOrder (OPEN)
  API->>OB: append AppointmentStarted, WorkOrderOpened
  API->>DB: COMMIT
  API-->>FE: workOrderId

  M->>FE: загружает фото «до»
  FE->>API: POST /work-orders/:id/photos/before
  API->>API: sharp resize, generate thumbnail
  API->>MinIO: putObject
  API->>DB: insert Photo
  API-->>FE: photoUrl

  M->>FE: добавляет расход материалов
  FE->>API: POST /work-orders/:id/consumption (5 раз)
  API->>DB: insert ConsumptionLine

  M->>FE: загружает фото «после», нажимает «Закрыть наряд»
  FE->>API: POST /work-orders/:id/close
  API->>DB: BEGIN
  API->>API: WorkOrder.close() — invariants
  API->>DB: workOrder.status = CLOSED
  API->>OB: append WorkOrderClosed
  API->>DB: COMMIT
  API-->>FE: 200

  Note over OB,Q: Outbox + Saga
  OB->>Q: enqueue WorkOrderClosed
  Q->>API: CloseWorkOrderSaga
  loop для каждой строки расхода
    API->>API: ConsumeStockCommand
    API->>DB: BEGIN
    API->>DB: select Stock for update (optimistic)
    API->>DB: select Batches by FEFO/FIFO
    API->>DB: update Batch.remainingQuantity
    API->>DB: insert StockMovement
    API->>OB: append StockConsumed
    API->>DB: COMMIT
  end
  Q->>API: CompleteAppointmentCommand
  API->>DB: appointment.status = COMPLETED
  
  Q->>API: NotifyClientOnWorkOrderCompleted
  API->>SMS: send «работы завершены, фото в личном кабинете»
  API->>TG: send (если linked) с фото

  Note over C: Клиент видит фото в client-app
  C->>FE: открывает «Мои записи → :id»
  FE->>API: GET /appointments/:id
  FE-->>C: фото «до/после», список услуг
```

---

> **Конец инженерной спецификации.**
>
> Этот документ — основа для разработки и должен поддерживаться актуальным по мере эволюции системы. Все архитектурные изменения — через новые ADR. Все изменения публичных контрактов API — через семантическое версионирование. Все изменения доменной модели — через обновление соответствующих разделов и согласование с командой.
