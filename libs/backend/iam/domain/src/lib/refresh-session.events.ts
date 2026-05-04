import { DomainEvent } from '@det/backend/shared/ddd';
import type { DateTime } from '@det/backend/shared/ddd';

import type { SessionId } from './session-id';
import type { UserId } from './user-id';

const REFRESH_SESSION_AGGREGATE_TYPE = 'RefreshSession';

function refreshSessionEventProps(sessionId: SessionId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: sessionId,
    aggregateType: REFRESH_SESSION_AGGREGATE_TYPE,
    eventId: `${eventType}:${sessionId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class RefreshSessionIssued extends DomainEvent {
  readonly eventType = 'RefreshSessionIssued';

  constructor(
    public readonly sessionId: SessionId,
    public readonly userId: UserId,
    public readonly issuedAt: DateTime,
  ) {
    super(refreshSessionEventProps(sessionId, 'RefreshSessionIssued', issuedAt));
  }
}

export class RefreshSessionRotated extends DomainEvent {
  readonly eventType = 'RefreshSessionRotated';

  constructor(
    public readonly sessionId: SessionId,
    public readonly previousTokenHash: string,
    public readonly currentTokenHash: string,
    public readonly rotatedAt: DateTime,
  ) {
    super(refreshSessionEventProps(sessionId, 'RefreshSessionRotated', rotatedAt));
  }
}

export class RefreshSessionRevoked extends DomainEvent {
  readonly eventType = 'RefreshSessionRevoked';

  constructor(
    public readonly sessionId: SessionId,
    public readonly revokedBy: UserId,
    public readonly revokedAt: DateTime,
  ) {
    super(refreshSessionEventProps(sessionId, 'RefreshSessionRevoked', revokedAt));
  }
}

export class RefreshSessionCompromised extends DomainEvent {
  readonly eventType = 'RefreshSessionCompromised';

  constructor(
    public readonly sessionId: SessionId,
    public readonly compromisedAt: DateTime,
  ) {
    super(refreshSessionEventProps(sessionId, 'RefreshSessionCompromised', compromisedAt));
  }
}
