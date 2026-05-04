---
trigger: model_decision
description: Правила для infrastructure-слоя — persistence, адаптеры, MikroORM.
globs: ["libs/backend/*/infrastructure/**/*.ts"]
---

# Infrastructure layer — правила

## Persistence

### Schema-классы

Каждый агрегат имеет соответствующий **persistence-класс** в `infrastructure/persistence/`:

```ts
// infrastructure/persistence/work-order.schema.ts
@Entity({ tableName: 'wo_work_order' })
export class WorkOrderSchema {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid' })
  appointmentId!: string;

  @Enum({ items: () => WorkOrderStatusEnum })
  status!: WorkOrderStatusEnum;

  @Property({ type: 'timestamptz' })
  openedAt!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Property({ type: 'jsonb' })
  servicesSnapshot!: ServiceSnapshot[];

  @OneToMany(() => ConsumptionLineSchema, line => line.workOrder, { orphanRemoval: true })
  consumptionLines = new Collection<ConsumptionLineSchema>(this);

  @Version()
  version!: number;
}
```

**Правила:**
- Имя файла — `*.schema.ts`. Имя класса — `*Schema`.
- Не содержит бизнес-логики, только поля и связи.
- Все ID — `uuid`.
- Все timestamp — `timestamptz` (с TZ).
- Деньги — `BIGINT cents` (через `@Property({ type: 'bigint' })`), не `numeric`/`decimal`.
- `@Version()` для критических агрегатов (оптимистичная блокировка): Stock, Appointment.

### Mapper

```ts
// infrastructure/persistence/work-order.mapper.ts
export class WorkOrderMapper {
  static toDomain(schema: WorkOrderSchema): WorkOrder {
    return WorkOrder.restore({
      id: WorkOrderId.from(schema.id),
      appointmentId: AppointmentId.from(schema.appointmentId),
      status: WorkOrderStatus.from(schema.status),
      services: schema.servicesSnapshot.map(ServiceSnapshotMapper.toDomain),
      consumption: schema.consumptionLines.getItems().map(ConsumptionLineMapper.toDomain),
      openedAt: DateTime.from(schema.openedAt),
      closedAt: schema.closedAt ? DateTime.from(schema.closedAt) : null,
    });
  }

  static toPersistence(domain: WorkOrder, existing: WorkOrderSchema | null): WorkOrderSchema {
    const out = existing ?? new WorkOrderSchema();
    const snap = domain.toSnapshot();
    out.id = snap.id;
    out.appointmentId = snap.appointmentId;
    out.status = snap.status;
    out.openedAt = snap.openedAt;
    out.closedAt = snap.closedAt;
    out.servicesSnapshot = snap.services;
    // collection merge: см. ConsumptionLineMapper
    return out;
  }
}
```

### Репозиторий

```ts
// infrastructure/persistence/work-order.repository.impl.ts
@Injectable()
export class WorkOrderRepositoryImpl implements IWorkOrderRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: WorkOrderId): Promise<WorkOrder | null> {
    const schema = await this.em.findOne(
      WorkOrderSchema,
      { id: id.toString() },
      { populate: ['consumptionLines', 'photos'] },
    );
    return schema ? WorkOrderMapper.toDomain(schema) : null;
  }

  async save(workOrder: WorkOrder): Promise<void> {
    const existing = await this.em.findOne(
      WorkOrderSchema,
      { id: workOrder.id.toString() },
      { populate: ['consumptionLines', 'photos'] },
    );
    const persisted = WorkOrderMapper.toPersistence(workOrder, existing);

    // Outbox в той же транзакции
    const events = workOrder.pullDomainEvents();
    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persistAndFlush(persisted);
  }
}
```

**Правила:**
- Метод `findById` — обязателен. Возвращает `Aggregate | null`.
- Метод `save` — принимает `Aggregate` целиком. Внутри — определяет, новый или обновление, через `findOne`.
- Outbox-события сохраняются в **той же транзакции**, что и агрегат. Иначе — рассинхрон.
- Не отдавай `EntityManager` или `Schema`-классы наружу.

## Adapters

```ts
// infrastructure/adapters/minio-photo-storage.adapter.ts
@Injectable()
export class MinioPhotoStorageAdapter implements IPhotoStoragePort {
  constructor(
    private readonly client: Client,
    private readonly config: ConfigService,
  ) {}

  async upload(file: UploadFile): Promise<PhotoStorageResult> {
    // resize, upload, return URL
  }
}
```

**Правила:**
- Один адаптер — один порт.
- Все внешние ошибки — оборачиваются в типизированные ошибки приложения (`PhotoUploadError extends ApplicationError`).
- Логируется через Pino с `requestId`.
- Никакой бизнес-логики — только адаптация контракта.

## Outbox

- Публикация в outbox происходит **внутри** `repository.save()` (см. выше).
- Отдельный модуль `OutboxModule` содержит `OutboxService` (append) и `OutboxPoller` (publish).
- Poller — `@Cron('*/1 * * * * *')` (каждую секунду) — забирает unpublished, публикует через EventBus.
- Idempotency: каждое событие имеет уникальный `eventId`; обработчик может проверять, не было ли уже обработано.

## Запрещено

- Возвращать `Schema`-объекты из методов репозитория.
- Раскрывать `EntityManager` приложениям/handlers.
- Импортировать `domain/` другого контекста.
- Делать `console.log` (только Pino).
- Хардкодить URL/ключи (только `ConfigService`).
- Использовать `as` для приведения типов в результатах БД.
