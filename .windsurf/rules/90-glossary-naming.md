---
trigger: always_on
description: Глоссарий и правила именования. Применяется ко всем файлам.
globs:
---

# Глоссарий — все имена строго отсюда

> Полный глоссарий — в `docs/product.md` § 2. Здесь — извлечённый минимум, чтобы агент не вводил синонимы.

## Организация

- **Студия** — `Studio`. (В MVP single-tenant; в коде сейчас ничего, но если речь — Studio, не Company/Workshop.)
- **Филиал** — `Branch`. Не `Location`, `Office`, `Site`, `Salon`.
- **Бокс / рабочий пост** — `Bay`. Не `Slot` (слот — единица времени), не `Workstation`.

## Роли

- **Владелец студии** — `Owner` (роль `OWNER`).
- **Администратор-приёмщик** — `Manager` (роль `MANAGER`).
- **Мастер** — `Master` (роль `MASTER`).
- **Клиент** — `Client` (роль `CLIENT`).

(В коде названия ролей — `SCREAMING_SNAKE`: `Role.OWNER`, и т.д.)

## Каталог услуг

- **Услуга** — `Service`. Не `Job`, `Procedure`, `Treatment`.
- **Категория услуг** — `ServiceCategory`.
- **Цена услуги** — `ServicePricing` (потому что зависит от типа кузова).
- **Тип кузова** — `BodyType`. Не `CarType`.
- **Норма расхода материала** — `MaterialNorm`.

## Материалы и склад

- **SKU / номенклатурная карточка** — `Sku`. Не `Item`, `Product`, `Material`, `Goods`. Класс — `Sku`, не `SKU` (PascalCase).
- **Артикул** — `articleNumber` (поле SKU).
- **Группа SKU** — `SkuGroup`.
- **Единица измерения** — `UnitOfMeasure` (или enum-значение `UnitOfMeasure.ML`, `.G`, `.PCS`, `.M`, `.L`, `.KG`).
- **Упаковка** — `Packaging`.
- **Поставщик** — `Supplier`. Не `Vendor`.
- **Партия** — `Batch`. Не `Lot`, `Parcel`, `BatchOfStock`.
- **Остаток (на филиал/SKU)** — `Stock`. Не `Inventory`. (Inventory — это название контекста.)
- **Движение склада** — `StockMovement`. Тип движения: `MovementType` (RECEIPT, CONSUMPTION, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, STOCK_TAKING).
- **Приход** — `Receipt`. Документ.
- **Списание** — `Consumption`. Списание = `StockConsumed` событие.
- **Корректировка** — `Adjustment`. Документ.
- **Перемещение между филиалами** — `Transfer`. Документ.
- **Инвентаризация** — `StockTaking`. Документ.
- **Минимальный остаток** — `reorderLevel` (поле `Stock`).
- **Средневзвешенная себестоимость** — `averageCost` (поле `Stock`).
- **Себестоимость партии** — `unitCost` (поле `Batch`).
- **Срок годности** — `expiresAt` (поле `Batch`).

## Клиенты и автомобили

- **Клиент** — `Client`. (Не `Customer` — мы используем `Client` единообразно.)
- **Зарегистрированный клиент** — `ClientType.REGULAR`.
- **Гость** — `ClientType.GUEST`.
- **Согласие на обработку ПДн** — `Consent`. `ConsentType` (PERSONAL_DATA_PROCESSING, MARKETING).
- **Анонимизация клиента** — `anonymize()` метод в агрегате `Client`.
- **Автомобиль клиента** — `Vehicle`. Не `Car`.
- **Госномер** — `licensePlate` (поле `Vehicle`).
- **VIN** — `vin`.

## Расписание и запись

- **Расписание филиала** — `BranchSchedule`.
- **Расписание мастера** — `MasterSchedule`.
- **Слот (единица времени)** — `Slot`. Соответствует `TimeSlot` VO.
- **Запись (бронирование клиента на услугу)** — `Appointment`. Не `Booking`, `Reservation`, `Visit`.
- **Статус записи** — `AppointmentStatus` (PENDING_CONFIRMATION, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW).
- **Канал создания записи** — `CreationChannel` (ONLINE, MANAGER, GUEST).
- **Заявка на отмену** (когда менее 24ч) — `CancellationRequest`.

## Наряды

- **Наряд (выполнение услуги)** — `WorkOrder`. Не `Order`, `Job`, `Task`.
- **Статус наряда** — `WorkOrderStatus` (OPEN, IN_PROGRESS, CLOSED, CANCELLED).
- **Фактический расход** — `ConsumptionLine` (entity внутри WorkOrder).
- **Норма (snapshot на момент создания наряда)** — `MaterialNormSnapshot`.
- **Расхождение нормы** — `deviationReason` (поле `ConsumptionLine`).
- **Фото «до»** — `PhotoBefore`. Поле — `photosBefore: PhotoRef[]`.
- **Фото «после»** — `PhotoAfter`. Поле — `photosAfter: PhotoRef[]`.

## Уведомления

- **Шаблон уведомления** — `NotificationTemplate`.
- **Уведомление (экземпляр доставки)** — `Notification`.
- **Канал уведомления** — `NotificationChannel` (EMAIL, SMS, TELEGRAM, PUSH).
- **Настройки уведомлений пользователя** — `UserNotificationPreferences`.

## Биллинг (демо)

- **Тариф** — `Plan`.
- **Подписка** — `Subscription`.
- **Счёт** — `Invoice`.

## Идентификаторы и базовые VO

- **Деньги** — `Money`. Никаких `Price`/`Cost` как самостоятельных типов; только поля `_price`/`_cost` типа `Money`.
- **Дата+время** — `DateTime` VO (обёртка над Date с timezone-aware операциями).
- **Длительность** — `Duration`.
- **Количество** — `Quantity` (amount + unit).
- **Знаковое количество** — `SignedQuantity`.
- **ID агрегата** — `<Aggregate>Id` (бренд-тип): `WorkOrderId`, `AppointmentId`, `SkuId`, `ClientId`, `UserId`, `BranchId`, `BatchId`.

## События — в прошедшем времени

```
✓ AppointmentCreated, WorkOrderClosed, StockReceived, ClientAnonymized
✗ CreateAppointment, CloseWorkOrder, ReceiveStock, AnonymizeClient (это команды)
```

## Команды — в повелительном наклонении

```
✓ CreateAppointmentCommand, CloseWorkOrderCommand, ReceiveStockCommand
✗ AppointmentCreatedCommand (это анти-паттерн)
```

## Запросы — `Get*` / `List*` / `Find*`

```
✓ GetWorkOrderQuery, ListAppointmentsQuery, FindClientByPhoneQuery, GetAvailableSlotsQuery
```

## Если ты ввёл термин, которого нет в глоссарии

1. Проверь ещё раз глоссарий в `product.md` § 2.
2. Если действительно нового — **не вводи его молча**. Открой обсуждение, обнови глоссарий тем же или предшествующим PR.
3. Никогда не используй два разных слова для одного и того же понятия.
