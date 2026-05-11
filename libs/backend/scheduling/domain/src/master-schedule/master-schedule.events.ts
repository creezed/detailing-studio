import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { BranchId } from '../value-objects/branch-id';
import type { MasterId } from '../value-objects/master-id';
import type { ScheduleId } from '../value-objects/schedule-id';
import type { UnavailabilityId } from '../value-objects/unavailability-id';

const MASTER_SCHEDULE_AGGREGATE_TYPE = 'MasterSchedule';

function msEventProps(scheduleId: ScheduleId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: scheduleId,
    aggregateType: MASTER_SCHEDULE_AGGREGATE_TYPE,
    eventId: `${eventType}:${scheduleId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class MasterScheduleCreated extends DomainEvent {
  readonly eventType = 'MasterScheduleCreated';

  constructor(
    public readonly scheduleId: ScheduleId,
    public readonly masterId: MasterId,
    public readonly branchId: BranchId,
    public readonly createdAt: DateTime,
  ) {
    super(msEventProps(scheduleId, 'MasterScheduleCreated', createdAt));
  }
}

export class MasterScheduleUpdated extends DomainEvent {
  readonly eventType = 'MasterScheduleUpdated';

  constructor(
    public readonly scheduleId: ScheduleId,
    public readonly updatedAt: DateTime,
  ) {
    super(msEventProps(scheduleId, 'MasterScheduleUpdated', updatedAt));
  }
}

export class MasterUnavailabilityAdded extends DomainEvent {
  readonly eventType = 'MasterUnavailabilityAdded';

  constructor(
    public readonly scheduleId: ScheduleId,
    public readonly unavailabilityId: UnavailabilityId,
    public readonly fromAt: DateTime,
    public readonly toAt: DateTime,
    public readonly addedAt: DateTime,
  ) {
    super(msEventProps(scheduleId, 'MasterUnavailabilityAdded', addedAt));
  }
}

export class MasterUnavailabilityRemoved extends DomainEvent {
  readonly eventType = 'MasterUnavailabilityRemoved';

  constructor(
    public readonly scheduleId: ScheduleId,
    public readonly unavailabilityId: UnavailabilityId,
    public readonly removedAt: DateTime,
  ) {
    super(msEventProps(scheduleId, 'MasterUnavailabilityRemoved', removedAt));
  }
}
