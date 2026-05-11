import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { PhotoType } from '../value-objects/photo-type';
import type { WorkOrderId } from '../value-objects/work-order-id';
import type { WorkOrderServiceSnapshotData } from '../value-objects/work-order-service-snapshot';

const WORK_ORDER_AGGREGATE_TYPE = 'WorkOrder';

function woEventProps(workOrderId: WorkOrderId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: workOrderId,
    aggregateType: WORK_ORDER_AGGREGATE_TYPE,
    eventId: `${eventType}:${workOrderId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export interface MaterialNormSnapshotData {
  readonly skuId: string;
  readonly skuNameSnapshot: string;
  readonly normAmount: number;
  readonly normUnit: string;
}

export class WorkOrderOpened extends DomainEvent {
  readonly eventType = 'WorkOrderOpened';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly appointmentId: string,
    public readonly branchId: string,
    public readonly masterId: string,
    public readonly clientId: string,
    public readonly vehicleId: string,
    public readonly services: readonly WorkOrderServiceSnapshotData[],
    public readonly norms: readonly MaterialNormSnapshotData[],
    public readonly openedAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderOpened', openedAt));
  }
}

export class WorkOrderPhotoAdded extends DomainEvent {
  readonly eventType = 'WorkOrderPhotoAdded';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly photoId: string,
    public readonly photoType: PhotoType,
    public readonly url: string,
    public readonly addedAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderPhotoAdded', addedAt));
  }
}

export class WorkOrderPhotoRemoved extends DomainEvent {
  readonly eventType = 'WorkOrderPhotoRemoved';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly photoId: string,
    public readonly photoType: PhotoType,
    public readonly removedAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderPhotoRemoved', removedAt));
  }
}

export class WorkOrderConsumptionAdded extends DomainEvent {
  readonly eventType = 'WorkOrderConsumptionAdded';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly lineId: string,
    public readonly skuId: string,
    public readonly actualAmount: number,
    public readonly actualUnit: string,
    public readonly addedAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderConsumptionAdded', addedAt));
  }
}

export class WorkOrderConsumptionUpdated extends DomainEvent {
  readonly eventType = 'WorkOrderConsumptionUpdated';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly lineId: string,
    public readonly actualAmount: number,
    public readonly actualUnit: string,
    public readonly updatedAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderConsumptionUpdated', updatedAt));
  }
}

export class WorkOrderConsumptionRemoved extends DomainEvent {
  readonly eventType = 'WorkOrderConsumptionRemoved';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly lineId: string,
    public readonly removedAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderConsumptionRemoved', removedAt));
  }
}

export class WorkOrderSubmittedForReview extends DomainEvent {
  readonly eventType = 'WorkOrderSubmittedForReview';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly submittedBy: string,
    public readonly submittedAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderSubmittedForReview', submittedAt));
  }
}

export class WorkOrderReturnedToInProgress extends DomainEvent {
  readonly eventType = 'WorkOrderReturnedToInProgress';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly returnedBy: string,
    public readonly reason: string,
    public readonly returnedAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderReturnedToInProgress', returnedAt));
  }
}

export class WorkOrderCancelled extends DomainEvent {
  readonly eventType = 'WorkOrderCancelled';

  constructor(
    public readonly workOrderId: WorkOrderId,
    public readonly reason: string,
    public readonly cancelledBy: string,
    public readonly cancelledAt: DateTime,
  ) {
    super(woEventProps(workOrderId, 'WorkOrderCancelled', cancelledAt));
  }
}
