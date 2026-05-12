import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

const AGGREGATE_TYPE = 'UserNotificationPreferences';

function eventProps(userId: UserId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: userId,
    aggregateType: AGGREGATE_TYPE,
    eventId: `${eventType}:${userId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class UserNotificationPreferencesUpdated extends DomainEvent {
  readonly eventType = 'UserNotificationPreferencesUpdated';

  constructor(
    public readonly userId: UserId,
    public readonly updatedAt: DateTime,
  ) {
    super(eventProps(userId, 'UserNotificationPreferencesUpdated', updatedAt));
  }
}
