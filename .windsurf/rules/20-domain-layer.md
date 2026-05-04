---
trigger: model_decision
description: Правила для domain-слоя — агрегаты, VO, события, инварианты. Применяется к libs/backend/<ctx>/domain/.
globs: ["libs/backend/*/domain/**/*.ts"]
---

# Domain layer — правила

## Стерильность

Domain-классы **не импортируют ничего из инфраструктуры**:
- Никаких `@nestjs/*`.
- Никаких `@mikro-orm/*`.
- Никаких HTTP-клиентов, логгеров, конфигов.
- Никаких BullMQ, Telegraf и пр.

Допускаются: стандартная библиотека TS, `@det/backend/shared/ddd`, `@det/shared/util`, `@det/shared/types` (только чистые функции и VO).

## AggregateRoot

```ts
import { AggregateRoot } from '@det/backend/shared/ddd';

export class WorkOrder extends AggregateRoot<WorkOrderId> {
  private constructor(
    public readonly id: WorkOrderId,
    private _appointmentId: AppointmentId,
    private _status: WorkOrderStatus,
    // ... приватные поля
  ) {
    super();
  }

  // Публичная фабрика (не конструктор)
  static openFromAppointment(props: OpenFromAppointmentProps): WorkOrder {
    // валидация инвариантов
    if (props.norms.length === 0) throw new EmptyNormsError();
    const wo = new WorkOrder(
      WorkOrderId.generate(),
      props.appointmentId,
      WorkOrderStatus.OPEN,
      // ...
    );
    wo.addEvent(new WorkOrderOpened(wo.id, props.appointmentId, props.now));
    return wo;
  }

  // Восстановление из persistence
  static restore(snapshot: WorkOrderSnapshot): WorkOrder {
    return new WorkOrder(/* ... */);
  }

  // Бизнес-методы
  close(now: DateTime): void {
    this.ensureCanClose();
    this._status = WorkOrderStatus.CLOSED;
    this._closedAt = now;
    this.addEvent(new WorkOrderClosed(this.id, now));
  }

  private ensureCanClose(): void {
    if (this._photosBefore.length === 0) throw new MissingBeforePhotoError(this.id);
    if (this._photosAfter.length === 0) throw new MissingAfterPhotoError(this.id);
    // ...
  }

  // Сериализация для маппера
  toSnapshot(): WorkOrderSnapshot { /* ... */ }
}
```

**Правила:**
- Конструктор `private`. Создание — через статические фабрики `create*` / `restore`.
- Поля приватные (`_status`), доступ через методы.
- Никаких публичных сеттеров. Только бизнес-методы (`close()`, `cancel()`, `addPhoto()`).
- Каждое значимое изменение состояния → `this.addEvent(...)`.
- Инварианты проверяются в фабриках и методах, до изменения состояния.

## Доменные события

- Имя — в **прошедшем времени**: `AppointmentCreated`, `WorkOrderClosed`, `StockReceived`.
- Класс наследует `DomainEvent`.
- Содержит только данные, нужные подписчикам.
- Не содержит ссылок на агрегаты — только ID и плоские VO.

```ts
export class WorkOrderClosed extends DomainEvent {
  readonly eventType = 'WorkOrderClosed';
  constructor(
    readonly workOrderId: WorkOrderId,
    readonly closedAt: DateTime,
    readonly consumptionSummary: ConsumptionSummary,
  ) { super(workOrderId.toString(), 'WorkOrder'); }
}
```

## Value Objects

- Иммутабельные.
- Сравнение по значению (`equals()` или библиотечный helper).
- Валидация в конструкторе/фабрике.

```ts
export class Money {
  private constructor(
    public readonly cents: bigint,
    public readonly currency: 'RUB',
  ) {}
  static rub(amount: number | bigint): Money {
    if (BigInt(amount) < 0n) throw new NegativeMoneyError();
    return new Money(BigInt(amount), 'RUB');
  }
  add(other: Money): Money { /* ... */ }
  equals(other: Money): boolean { return this.cents === other.cents && this.currency === other.currency; }
}
```

## Domain-сервисы

- Используются, когда логика не принадлежит ни одному агрегату (например, расчёт доступных слотов из нескольких источников).
- Чистые функции / классы без состояния.
- Инжектятся в application через port (`Clock`, `BatchSelectionService`).

## Ошибки

- Все доменные ошибки наследуются от `DomainError`:

```ts
export class CannotCloseWorkOrderError extends DomainError {
  readonly code = 'CANNOT_CLOSE_WORK_ORDER';
  readonly httpStatus = 422;
  constructor(public readonly workOrderId: WorkOrderId, public readonly reason: string) {
    super(`Cannot close work order ${workOrderId}: ${reason}`);
  }
}
```

- **Запрещено** `throw new Error('...')` в domain.

## Запрещено

- `new Date()`, `Date.now()`. Используй `Clock` (передаётся в метод как параметр).
- `Math.random()`, `crypto.randomUUID()`. Используй `IdGenerator` (передаётся в фабрику или DI).
- Прямые ссылки на другие агрегаты. Только ID + бренд-тип.
- Async-методы в агрегате. Все методы синхронные. Async — в application.
- Импорт `application/`, `infrastructure/`, `interfaces/`.
- Декораторы (`@Injectable`, `@Entity`, ...). Только чистый TS.

## Тестирование

- Каждый агрегат покрыт unit-тестами:
  - Каждый бизнес-метод (success).
  - Каждый инвариант (failure).
  - Публикация событий.
- Без моков. Все зависимости — другие domain-объекты.
