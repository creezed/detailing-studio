import { DomainEvent } from '@det/backend/shared/ddd';
import type { DateTime } from '@det/backend/shared/ddd';

import type { Email } from './email.value-object';
import type { Role } from './role';
import type { UserId } from './user-id';
import type { UserStatus } from './user-status';

const USER_AGGREGATE_TYPE = 'User';

function userEventProps(userId: UserId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: userId,
    aggregateType: USER_AGGREGATE_TYPE,
    eventId: `${eventType}:${userId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class UserRegistered extends DomainEvent {
  readonly eventType = 'UserRegistered';

  constructor(
    public readonly userId: UserId,
    public readonly email: Email,
    public readonly role: Role,
    public readonly status: UserStatus,
    public readonly registeredAt: DateTime,
  ) {
    super(userEventProps(userId, 'UserRegistered', registeredAt));
  }
}

export class UserPasswordChanged extends DomainEvent {
  readonly eventType = 'UserPasswordChanged';

  constructor(
    public readonly userId: UserId,
    public readonly changedAt: DateTime,
  ) {
    super(userEventProps(userId, 'UserPasswordChanged', changedAt));
  }
}

export class UserBlocked extends DomainEvent {
  readonly eventType = 'UserBlocked';

  constructor(
    public readonly userId: UserId,
    public readonly blockedBy: UserId,
    public readonly reason: string,
    public readonly blockedAt: DateTime,
  ) {
    super(userEventProps(userId, 'UserBlocked', blockedAt));
  }
}

export class UserUnblocked extends DomainEvent {
  readonly eventType = 'UserUnblocked';

  constructor(
    public readonly userId: UserId,
    public readonly unblockedBy: UserId,
    public readonly unblockedAt: DateTime,
  ) {
    super(userEventProps(userId, 'UserUnblocked', unblockedAt));
  }
}

export class UserActivated extends DomainEvent {
  readonly eventType = 'UserActivated';

  constructor(
    public readonly userId: UserId,
    public readonly activatedAt: DateTime,
  ) {
    super(userEventProps(userId, 'UserActivated', activatedAt));
  }
}

export class UserArchived extends DomainEvent {
  readonly eventType = 'UserArchived';

  constructor(
    public readonly userId: UserId,
    public readonly archivedBy: UserId,
    public readonly archivedAt: DateTime,
  ) {
    super(userEventProps(userId, 'UserArchived', archivedAt));
  }
}
