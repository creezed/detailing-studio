import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { BayId } from '../value-objects/bay-id';
import type { BranchId } from '../value-objects/branch-id';

const BAY_AGGREGATE_TYPE = 'Bay';

function bayEventProps(bayId: BayId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: bayId,
    aggregateType: BAY_AGGREGATE_TYPE,
    eventId: `${eventType}:${bayId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class BayCreated extends DomainEvent {
  readonly eventType = 'BayCreated';

  constructor(
    public readonly bayId: BayId,
    public readonly branchId: BranchId,
    public readonly name: string,
    public readonly createdAt: DateTime,
  ) {
    super(bayEventProps(bayId, 'BayCreated', createdAt));
  }
}

export class BayRenamed extends DomainEvent {
  readonly eventType = 'BayRenamed';

  constructor(
    public readonly bayId: BayId,
    public readonly newName: string,
    public readonly renamedAt: DateTime,
  ) {
    super(bayEventProps(bayId, 'BayRenamed', renamedAt));
  }
}

export class BayDeactivated extends DomainEvent {
  readonly eventType = 'BayDeactivated';

  constructor(
    public readonly bayId: BayId,
    public readonly deactivatedAt: DateTime,
  ) {
    super(bayEventProps(bayId, 'BayDeactivated', deactivatedAt));
  }
}

export class BayReactivated extends DomainEvent {
  readonly eventType = 'BayReactivated';

  constructor(
    public readonly bayId: BayId,
    public readonly reactivatedAt: DateTime,
  ) {
    super(bayEventProps(bayId, 'BayReactivated', reactivatedAt));
  }
}
