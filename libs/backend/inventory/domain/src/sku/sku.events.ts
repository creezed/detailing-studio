import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { SkuId } from './sku-id';

const SKU_AGGREGATE_TYPE = 'Sku';

function skuEventProps(skuId: SkuId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: skuId,
    aggregateType: SKU_AGGREGATE_TYPE,
    eventId: `${eventType}:${skuId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class SkuCreated extends DomainEvent {
  readonly eventType = 'SkuCreated';

  constructor(
    public readonly skuId: SkuId,
    public readonly articleNumber: string,
    public readonly createdAt: DateTime,
  ) {
    super(skuEventProps(skuId, 'SkuCreated', createdAt));
  }
}

export class SkuRenamed extends DomainEvent {
  readonly eventType = 'SkuRenamed';

  constructor(
    public readonly skuId: SkuId,
    public readonly newName: string,
    public readonly renamedAt: DateTime,
  ) {
    super(skuEventProps(skuId, 'SkuRenamed', renamedAt));
  }
}

export class SkuGroupChanged extends DomainEvent {
  readonly eventType = 'SkuGroupChanged';

  constructor(
    public readonly skuId: SkuId,
    public readonly newGroup: string,
    public readonly changedAt: DateTime,
  ) {
    super(skuEventProps(skuId, 'SkuGroupChanged', changedAt));
  }
}

export class SkuPackagingsUpdated extends DomainEvent {
  readonly eventType = 'SkuPackagingsUpdated';

  constructor(
    public readonly skuId: SkuId,
    public readonly updatedAt: DateTime,
  ) {
    super(skuEventProps(skuId, 'SkuPackagingsUpdated', updatedAt));
  }
}

export class SkuBarcodeAssigned extends DomainEvent {
  readonly eventType = 'SkuBarcodeAssigned';

  constructor(
    public readonly skuId: SkuId,
    public readonly barcode: string,
    public readonly assignedAt: DateTime,
  ) {
    super(skuEventProps(skuId, 'SkuBarcodeAssigned', assignedAt));
  }
}

export class SkuBarcodeRemoved extends DomainEvent {
  readonly eventType = 'SkuBarcodeRemoved';

  constructor(
    public readonly skuId: SkuId,
    public readonly removedAt: DateTime,
  ) {
    super(skuEventProps(skuId, 'SkuBarcodeRemoved', removedAt));
  }
}

export class SkuDeactivated extends DomainEvent {
  readonly eventType = 'SkuDeactivated';

  constructor(
    public readonly skuId: SkuId,
    public readonly deactivatedAt: DateTime,
  ) {
    super(skuEventProps(skuId, 'SkuDeactivated', deactivatedAt));
  }
}

export class SkuReactivated extends DomainEvent {
  readonly eventType = 'SkuReactivated';

  constructor(
    public readonly skuId: SkuId,
    public readonly reactivatedAt: DateTime,
  ) {
    super(skuEventProps(skuId, 'SkuReactivated', reactivatedAt));
  }
}
