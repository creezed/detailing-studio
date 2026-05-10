import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { SkuId, UserId } from '@det/shared-types';

import type { AdjustmentId } from './adjustment-id';
import type { AdjustmentStatus } from './adjustment-status';
import type { SignedQuantity } from '../value-objects/signed-quantity.value-object';

const ADJUSTMENT_AGGREGATE_TYPE = 'Adjustment';

function adjustmentEventProps(id: AdjustmentId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: id as string,
    aggregateType: ADJUSTMENT_AGGREGATE_TYPE,
    eventId: `${eventType}:${id as string}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export interface AdjustmentLineSnapshot {
  readonly skuId: SkuId;
  readonly delta: SignedQuantity;
}

export class AdjustmentCreated extends DomainEvent {
  readonly eventType = 'AdjustmentCreated';

  constructor(
    public readonly adjustmentId: AdjustmentId,
    public readonly status: AdjustmentStatus,
    public readonly createdAt: DateTime,
  ) {
    super(adjustmentEventProps(adjustmentId, 'AdjustmentCreated', createdAt));
  }
}

export class AdjustmentApproved extends DomainEvent {
  readonly eventType = 'AdjustmentApproved';

  constructor(
    public readonly adjustmentId: AdjustmentId,
    public readonly branchId: string,
    public readonly lines: readonly AdjustmentLineSnapshot[],
    public readonly reason: string,
    public readonly approvedBy: UserId,
    public readonly approvedAt: DateTime,
  ) {
    super(adjustmentEventProps(adjustmentId, 'AdjustmentApproved', approvedAt));
  }
}

export class AdjustmentRejected extends DomainEvent {
  readonly eventType = 'AdjustmentRejected';

  constructor(
    public readonly adjustmentId: AdjustmentId,
    public readonly rejectedBy: UserId,
    public readonly rejectionReason: string,
    public readonly rejectedAt: DateTime,
  ) {
    super(adjustmentEventProps(adjustmentId, 'AdjustmentRejected', rejectedAt));
  }
}
