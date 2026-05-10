import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import type { StockTakingId } from './stock-taking-id';
import type { SignedQuantity } from '../value-objects/signed-quantity.value-object';

const STOCK_TAKING_AGGREGATE_TYPE = 'StockTaking';

function stockTakingEventProps(id: StockTakingId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: id as string,
    aggregateType: STOCK_TAKING_AGGREGATE_TYPE,
    eventId: `${eventType}:${id as string}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class StockTakingStarted extends DomainEvent {
  readonly eventType = 'StockTakingStarted';

  constructor(
    public readonly stockTakingId: StockTakingId,
    public readonly branchId: BranchId,
    public readonly startedAt: DateTime,
  ) {
    super(stockTakingEventProps(stockTakingId, 'StockTakingStarted', startedAt));
  }
}

export interface StockTakingDeltaSnapshot {
  readonly skuId: SkuId;
  readonly delta: SignedQuantity;
}

export class StockTakingPosted extends DomainEvent {
  readonly eventType = 'StockTakingPosted';

  constructor(
    public readonly stockTakingId: StockTakingId,
    public readonly branchId: BranchId,
    public readonly deltas: readonly StockTakingDeltaSnapshot[],
    public readonly postedBy: UserId,
    public readonly postedAt: DateTime,
  ) {
    super(stockTakingEventProps(stockTakingId, 'StockTakingPosted', postedAt));
  }
}

export class StockTakingCancelled extends DomainEvent {
  readonly eventType = 'StockTakingCancelled';

  constructor(
    public readonly stockTakingId: StockTakingId,
    public readonly cancelledAt: DateTime,
  ) {
    super(stockTakingEventProps(stockTakingId, 'StockTakingCancelled', cancelledAt));
  }
}
