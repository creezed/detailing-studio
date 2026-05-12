import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { NotificationId } from '@det/shared-types';

import type { NotificationChannel } from '../value-objects/notification-channel';
import type { TemplateCode } from '../value-objects/template-code';

const AGGREGATE_TYPE = 'Notification';

function eventProps(id: NotificationId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: id,
    aggregateType: AGGREGATE_TYPE,
    eventId: `${eventType}:${id}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class NotificationIssued extends DomainEvent {
  readonly eventType = 'NotificationIssued';

  constructor(
    public readonly notificationId: NotificationId,
    public readonly templateCode: TemplateCode,
    public readonly channel: NotificationChannel,
    public readonly issuedAt: DateTime,
  ) {
    super(eventProps(notificationId, 'NotificationIssued', issuedAt));
  }
}

export class NotificationQueued extends DomainEvent {
  readonly eventType = 'NotificationQueued';

  constructor(
    public readonly notificationId: NotificationId,
    public readonly queuedAt: DateTime,
  ) {
    super(eventProps(notificationId, 'NotificationQueued', queuedAt));
  }
}

export class NotificationDeduped extends DomainEvent {
  readonly eventType = 'NotificationDeduped';

  constructor(
    public readonly notificationId: NotificationId,
    public readonly dedupedAt: DateTime,
  ) {
    super(eventProps(notificationId, 'NotificationDeduped', dedupedAt));
  }
}

export class NotificationDelivered extends DomainEvent {
  readonly eventType = 'NotificationDelivered';

  constructor(
    public readonly notificationId: NotificationId,
    public readonly providerId: string,
    public readonly deliveredAt: DateTime,
  ) {
    super(eventProps(notificationId, 'NotificationDelivered', deliveredAt));
  }
}

export class NotificationRetryScheduled extends DomainEvent {
  readonly eventType = 'NotificationRetryScheduled';

  constructor(
    public readonly notificationId: NotificationId,
    public readonly attemptNo: number,
    public readonly error: string,
    public readonly scheduledAt: DateTime,
  ) {
    super(eventProps(notificationId, 'NotificationRetryScheduled', scheduledAt));
  }
}

export class NotificationFailed extends DomainEvent {
  readonly eventType = 'NotificationFailed';

  constructor(
    public readonly notificationId: NotificationId,
    public readonly error: string,
    public readonly failedAt: DateTime,
  ) {
    super(eventProps(notificationId, 'NotificationFailed', failedAt));
  }
}

export class NotificationExpired extends DomainEvent {
  readonly eventType = 'NotificationExpired';

  constructor(
    public readonly notificationId: NotificationId,
    public readonly expiredAt: DateTime,
  ) {
    super(eventProps(notificationId, 'NotificationExpired', expiredAt));
  }
}
