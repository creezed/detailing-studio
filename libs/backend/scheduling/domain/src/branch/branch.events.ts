import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { BranchId } from '../value-objects/branch-id';

const BRANCH_AGGREGATE_TYPE = 'Branch';

function branchEventProps(branchId: BranchId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: branchId,
    aggregateType: BRANCH_AGGREGATE_TYPE,
    eventId: `${eventType}:${branchId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class BranchCreated extends DomainEvent {
  readonly eventType = 'BranchCreated';

  constructor(
    public readonly branchId: BranchId,
    public readonly name: string,
    public readonly timezone: string,
    public readonly createdAt: DateTime,
  ) {
    super(branchEventProps(branchId, 'BranchCreated', createdAt));
  }
}

export class BranchRenamed extends DomainEvent {
  readonly eventType = 'BranchRenamed';

  constructor(
    public readonly branchId: BranchId,
    public readonly newName: string,
    public readonly renamedAt: DateTime,
  ) {
    super(branchEventProps(branchId, 'BranchRenamed', renamedAt));
  }
}

export class BranchAddressUpdated extends DomainEvent {
  readonly eventType = 'BranchAddressUpdated';

  constructor(
    public readonly branchId: BranchId,
    public readonly newAddress: string,
    public readonly updatedAt: DateTime,
  ) {
    super(branchEventProps(branchId, 'BranchAddressUpdated', updatedAt));
  }
}

export class BranchTimezoneChanged extends DomainEvent {
  readonly eventType = 'BranchTimezoneChanged';

  constructor(
    public readonly branchId: BranchId,
    public readonly newTimezone: string,
    public readonly changedAt: DateTime,
  ) {
    super(branchEventProps(branchId, 'BranchTimezoneChanged', changedAt));
  }
}

export class BranchDeactivated extends DomainEvent {
  readonly eventType = 'BranchDeactivated';

  constructor(
    public readonly branchId: BranchId,
    public readonly deactivatedAt: DateTime,
  ) {
    super(branchEventProps(branchId, 'BranchDeactivated', deactivatedAt));
  }
}

export class BranchReactivated extends DomainEvent {
  readonly eventType = 'BranchReactivated';

  constructor(
    public readonly branchId: BranchId,
    public readonly reactivatedAt: DateTime,
  ) {
    super(branchEventProps(branchId, 'BranchReactivated', reactivatedAt));
  }
}
