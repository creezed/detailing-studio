import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime, Money, Quantity } from '@det/backend-shared-ddd';
import type { BranchId, UserId } from '@det/shared-types';

import type { BatchAllocation } from './batch-selector.interface';
import type { ConsumptionReason } from './consumption-reason';
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

export class StockConsumed extends DomainEvent {
  readonly eventType = 'StockConsumed';

  constructor(
    public readonly stockId: StockId,
    public readonly amount: Quantity,
    public readonly reason: ConsumptionReason,
    public readonly allocations: readonly BatchAllocation[],
    public readonly totalCost: Money,
    public readonly consumedAt: DateTime,
  ) {
    super(stockEventProps(stockId, 'StockConsumed', consumedAt));
  }
}

export class StockAdjusted extends DomainEvent {
  readonly eventType = 'StockAdjusted';

  constructor(
    public readonly stockId: StockId,
    public readonly deltaAmount: number,
    public readonly reason: string,
    public readonly by: UserId,
    public readonly adjustedAt: DateTime,
  ) {
    super(stockEventProps(stockId, 'StockAdjusted', adjustedAt));
  }
}

export class StockTransferredOut extends DomainEvent {
  readonly eventType = 'StockTransferredOut';

  constructor(
    public readonly stockId: StockId,
    public readonly amount: Quantity,
    public readonly targetBranch: BranchId,
    public readonly transferredAt: DateTime,
  ) {
    super(stockEventProps(stockId, 'StockTransferredOut', transferredAt));
  }
}

export class StockTransferredIn extends DomainEvent {
  readonly eventType = 'StockTransferredIn';

  constructor(
    public readonly stockId: StockId,
    public readonly amount: Quantity,
    public readonly transferredAt: DateTime,
  ) {
    super(stockEventProps(stockId, 'StockTransferredIn', transferredAt));
  }
}

export class LowStockReached extends DomainEvent {
  readonly eventType = 'LowStockReached';

  constructor(
    public readonly stockId: StockId,
    public readonly remaining: Quantity,
    public readonly reorderLevel: Quantity,
    public readonly at: DateTime,
  ) {
    super(stockEventProps(stockId, 'LowStockReached', at));
  }
}

export class OutOfStockReached extends DomainEvent {
  readonly eventType = 'OutOfStockReached';

  constructor(
    public readonly stockId: StockId,
    public readonly at: DateTime,
  ) {
    super(stockEventProps(stockId, 'OutOfStockReached', at));
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
