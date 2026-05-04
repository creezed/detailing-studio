---
trigger: always_on
description: Архитектурные инварианты DDD/гексагональной архитектуры. Применяется ко всем файлам backend в libs/backend/ и apps/backend/.
globs: ["libs/backend/**/*.ts", "apps/backend/**/*.ts"]
---

# Архитектура — слои и границы

## Слои

Каждый bounded context разбит на 4 отдельных Nx-library внутри `libs/backend/<ctx>/`:

```
libs/backend/<ctx>/
├── domain/          ← Nx lib: чистый TS, без зависимостей от инфраструктуры
├── application/     ← Nx lib: use cases, ports, sagas
├── infrastructure/  ← Nx lib: MikroORM, адаптеры, реализации портов
└── interfaces/      ← Nx lib: HTTP controllers, WS gateways
```

Теги всех backend-libs: `["scope:<ctx>", "type:<layer>", "platform:node"]`. @nx/enforce-module-boundaries блокирует:
- кросс-слойные импорты (по `type:`),
- кросс-контекстные импорты (по `scope:`),
- импорты Angular-кода (по `platform:angular`).

## Правила импорта (enforced через @nx/enforce-module-boundaries)

| Слой | Может импортировать |
|------|---------------------|
| `domain/` | свой `domain/`, `@det/backend/shared/ddd`, `@det/shared/util`, `@det/shared/types`. Больше ничего. |
| `application/` | свой `domain/`, `application/`, `@det/shared/contracts`, `libs/backend/shared/*`, `libs/shared/*`. Не `infrastructure/`. |
| `infrastructure/` | свой `domain/`, `application/`, `infrastructure/`, `libs/backend/shared/*`, `libs/shared/*`. |
| `interfaces/` | свой `application/`, `interfaces/`, `@det/shared/contracts`, `libs/backend/shared/*`, `libs/shared/*`. Не трогает `domain/` и `infrastructure/` напрямую. |

## Cross-context

- **Запрещено** импортировать `@det/<ctx-A>/domain` из `libs/<ctx-B>/`.
- Кросс-контекстная связь — **только** через `application/ports/` (port + adapter).

```ts
// ✓ хорошо
// libs/backend/work-order/application/src/lib/ports/inventory-stock.port.ts
export interface IInventoryStockPort {
  consume(skuId: string, branchId: string, amount: Quantity): Promise<void>;
}

// libs/backend/work-order/infrastructure/src/lib/adapters/inventory-stock-port.adapter.ts
@Injectable()
export class InventoryStockPortAdapter implements IInventoryStockPort {
  constructor(private readonly bus: CommandBus) {}
  consume(...) { return this.bus.execute(new ConsumeStockCommand(...)); }
}

// ✗ плохо
// libs/backend/work-order/application/src/lib/commands/close-work-order.handler.ts
import { Stock } from '@det/backend/inventory/domain';
```

## Запрещено в domain/

```ts
// ✗ всё это запрещено в **/domain/**
import { Injectable, Logger } from '@nestjs/common';
import { Entity, PrimaryKey } from '@mikro-orm/core';
import axios from 'axios';
import pino from 'pino';
import { ConfigService } from '@nestjs/config';
```

## Discovery

- Если для реализации логики нужно импортировать что-то из инфраструктуры — это **не доменная логика**. Подними её в `application/` через порт.
- Если нужно вызвать внешний сервис (SMS, email, Telegram, ЮKassa) — определи порт в `application/ports/`, реализуй адаптер в `infrastructure/adapters/`.

## Один агрегат = одна транзакция

- Команда меняет ровно один агрегат.
- Если бизнес-логика требует изменить два агрегата → раздели на два use case + событие через outbox.
- Между агрегатами — ссылка только по ID, не объектом.

```ts
// ✓ хорошо
class WorkOrder {
  private _clientId: ClientId;
  private _vehicleId: VehicleId;
  private _masterId: MasterId;
}

// ✗ плохо
class WorkOrder {
  private _client: Client;
  private _vehicle: Vehicle;
}
```

## Persistence ≠ Domain

- Доменный класс (`WorkOrder`) и persistence-схема (`WorkOrderSchema`) — **разные классы**.
- Между ними — `Mapper` в `infrastructure/persistence/`.
- Репозиторий принимает/возвращает только **доменный** агрегат.

## CQRS

- Команды (`*.command.ts` + `*.handler.ts`) — меняют состояние, возвращают `void` или ID.
- Запросы (`*.query.ts` + `*.handler.ts`) — только чтение, возвращают DTO.
- Запросы могут читать напрямую через MikroORM QueryBuilder (минуя domain-репозитории).
