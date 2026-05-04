---
trigger: model_decision
description: Правила для application-слоя — command/query handlers, ports, sagas.
globs: ["libs/backend/*/application/**/*.ts"]
---

# Application layer — правила

## Command handlers

```ts
@CommandHandler(CloseWorkOrderCommand)
export class CloseWorkOrderHandler implements ICommandHandler<CloseWorkOrderCommand, void> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: CloseWorkOrderCommand): Promise<void> {
    const wo = await this.repo.findById(cmd.workOrderId);
    if (!wo) throw new WorkOrderNotFoundError(cmd.workOrderId);

    wo.close(this.clock.now());

    await this.repo.save(wo);
  }
}
```

**Правила:**
- Один handler — одна команда.
- Возвращает `void` или ID нового агрегата. **Не возвращает DTO/агрегат целиком.**
- Никакой бизнес-логики в handler — только оркестрация (load → invoke → save).
- Все зависимости — через **constructor DI**.
- Зависимости — на интерфейсы (порты), не на конкретные реализации.

## Query handlers

```ts
@QueryHandler(ListAppointmentsQuery)
export class ListAppointmentsHandler implements IQueryHandler<ListAppointmentsQuery, AppointmentListItemDto[]> {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async execute(q: ListAppointmentsQuery): Promise<AppointmentListItemDto[]> {
    const qb = this.em.createQueryBuilder(AppointmentSchema, 'a')
      .select(['a.id', 'a.startsAt', 'a.endsAt', 'a.status', /* ... */])
      .where({ branchId: q.branchId })
      .andWhere({ startsAt: { $gte: q.from, $lte: q.to } })
      .orderBy({ startsAt: 'ASC' });

    const rows = await qb.execute();
    return rows.map(toListItemDto);
  }
}
```

**Правила:**
- Запрос **только читает**, никаких мутаций.
- Может ходить в `infrastructure/persistence/` напрямую (минуя domain-репозитории).
- Возвращает плоские DTO с примитивами (string, number, ISO date).
- Никаких domain-объектов наружу.

## Ports

- Описывают то, что нужно application-слою от внешнего мира (storage, integrations, time, IDs).
- Лежат в `application/ports/` (или `domain/` если порт чисто доменный, как `Clock`).
- Реализуются адаптерами в `infrastructure/adapters/`.

```ts
// application/ports/photo-storage.port.ts
export const PHOTO_STORAGE_PORT = Symbol('PHOTO_STORAGE_PORT');
export interface IPhotoStoragePort {
  upload(file: UploadFile): Promise<PhotoStorageResult>;
  delete(photoId: string): Promise<void>;
}
```

## Sagas (Process Managers)

- Реагируют на событие → выпускают команду → реагируют на следующее событие.
- Используются для кросс-агрегатных сценариев (см. engineering.md § 2.12).
- Идемпотентны: повторная обработка одного события не должна ломать систему.

```ts
@Injectable()
export class CloseWorkOrderSaga {
  constructor(private readonly commandBus: CommandBus) {}

  @Saga()
  workOrderClosed = (events$: Observable<any>): Observable<ICommand> =>
    events$.pipe(
      ofType(WorkOrderClosed),
      mergeMap(event => from(this.handleClosed(event))),
      filter((c): c is ICommand => c !== null),
    );

  private async handleClosed(event: WorkOrderClosed): Promise<ICommand> {
    // Списываем со склада для каждой строки
    for (const line of event.consumptionSummary.lines) {
      await this.commandBus.execute(
        new ConsumeStockCommand(line.skuId, line.amount, line.branchId, event.workOrderId),
      );
    }
    return new CompleteAppointmentCommand(event.appointmentId);
  }
}
```

## Запрещено

- Вызывать внешние сервисы напрямую (SMS, email, ...). Только через порты.
- Хранить состояние между вызовами (handler — stateless).
- Возвращать domain-объекты из query handlers.
- Делать transactions вручную через `em.transactional()` — оборачивает middleware/interceptor.
- Импорт `infrastructure/` напрямую. Только через токены DI.

## Тестирование

- Integration-тесты через Jest + Testcontainers.
- Поднимается реальная PG, миграции применяются.
- Внешние адаптеры (SMS, ЮKassa) — мокаются.
- Тестируется: команда → агрегат → БД → outbox.
