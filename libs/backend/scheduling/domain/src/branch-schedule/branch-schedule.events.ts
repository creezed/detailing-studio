import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { BranchId } from '../value-objects/branch-id';
import type { ScheduleId } from '../value-objects/schedule-id';

const BRANCH_SCHEDULE_AGGREGATE_TYPE = 'BranchSchedule';

function scheduleEventProps(scheduleId: ScheduleId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: scheduleId,
    aggregateType: BRANCH_SCHEDULE_AGGREGATE_TYPE,
    eventId: `${eventType}:${scheduleId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class BranchScheduleSet extends DomainEvent {
  readonly eventType = 'BranchScheduleSet';

  constructor(
    public readonly scheduleId: ScheduleId,
    public readonly branchId: BranchId,
    public readonly setAt: DateTime,
  ) {
    super(scheduleEventProps(scheduleId, 'BranchScheduleSet', setAt));
  }
}

export class BranchScheduleExceptionAdded extends DomainEvent {
  readonly eventType = 'BranchScheduleExceptionAdded';

  constructor(
    public readonly scheduleId: ScheduleId,
    public readonly date: string,
    public readonly addedAt: DateTime,
  ) {
    super(scheduleEventProps(scheduleId, 'BranchScheduleExceptionAdded', addedAt));
  }
}

export class BranchScheduleExceptionRemoved extends DomainEvent {
  readonly eventType = 'BranchScheduleExceptionRemoved';

  constructor(
    public readonly scheduleId: ScheduleId,
    public readonly date: string,
    public readonly removedAt: DateTime,
  ) {
    super(scheduleEventProps(scheduleId, 'BranchScheduleExceptionRemoved', removedAt));
  }
}
