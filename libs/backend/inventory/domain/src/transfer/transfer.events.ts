import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime, Quantity } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import type { TransferId } from './transfer-id';

const TRANSFER_AGGREGATE_TYPE = 'Transfer';

function transferEventProps(id: TransferId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: id as string,
    aggregateType: TRANSFER_AGGREGATE_TYPE,
    eventId: `${eventType}:${id as string}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export interface TransferLineSnapshot {
  readonly skuId: SkuId;
  readonly quantity: Quantity;
}

export class TransferCreated extends DomainEvent {
  readonly eventType = 'TransferCreated';

  constructor(
    public readonly transferId: TransferId,
    public readonly createdAt: DateTime,
  ) {
    super(transferEventProps(transferId, 'TransferCreated', createdAt));
  }
}

export class TransferPosted extends DomainEvent {
  readonly eventType = 'TransferPosted';

  constructor(
    public readonly transferId: TransferId,
    public readonly fromBranchId: BranchId,
    public readonly toBranchId: BranchId,
    public readonly lines: readonly TransferLineSnapshot[],
    public readonly postedBy: UserId,
    public readonly postedAt: DateTime,
  ) {
    super(transferEventProps(transferId, 'TransferPosted', postedAt));
  }
}

export class TransferCancelled extends DomainEvent {
  readonly eventType = 'TransferCancelled';

  constructor(
    public readonly transferId: TransferId,
    public readonly cancelledAt: DateTime,
  ) {
    super(transferEventProps(transferId, 'TransferCancelled', cancelledAt));
  }
}
