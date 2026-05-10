import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime, Money, Quantity } from '@det/backend-shared-ddd';

import type { StockId } from './stock-id';

const STOCK_AGGREGATE_TYPE = 'Stock';

function stockEventProps(stockId: StockId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: stockId as string,
    aggregateType: STOCK_AGGREGATE_TYPE,
    eventId: `${eventType}:${stockId as string}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class StockOpened extends DomainEvent {
  readonly eventType = 'StockOpened';

  constructor(
    public readonly stockId: StockId,
    public readonly openedAt: DateTime,
  ) {
    super(stockEventProps(stockId, 'StockOpened', openedAt));
  }
}

export class StockReceived extends DomainEvent {
  readonly eventType = 'StockReceived';

  constructor(
    public readonly stockId: StockId,
    public readonly quantity: Quantity,
    public readonly unitCost: Money,
    public readonly receivedAt: DateTime,
  ) {
    super(stockEventProps(stockId, 'StockReceived', receivedAt));
  }
}

export class ReorderLevelChanged extends DomainEvent {
  readonly eventType = 'ReorderLevelChanged';

  constructor(
    public readonly stockId: StockId,
    public readonly newLevel: Quantity,
    public readonly changedAt: DateTime,
  ) {
    super(stockEventProps(stockId, 'ReorderLevelChanged', changedAt));
  }
}
