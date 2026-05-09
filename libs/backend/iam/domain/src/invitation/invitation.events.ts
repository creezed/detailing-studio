import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime, PhoneNumber } from '@det/backend-shared-ddd';

import type { InvitationId } from './invitation-id';
import type { InvitationStatus } from './invitation-status';
import type { Email } from '../shared/email.value-object';
import type { PasswordHash } from '../shared/password-hash.value-object';
import type { Role } from '../shared/role';
import type { UserId } from '../user/user-id';

const INVITATION_AGGREGATE_TYPE = 'Invitation';

function invitationEventProps(invitationId: InvitationId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: invitationId,
    aggregateType: INVITATION_AGGREGATE_TYPE,
    eventId: `${eventType}:${invitationId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class InvitationIssued extends DomainEvent {
  readonly eventType = 'InvitationIssued';

  constructor(
    public readonly invitationId: InvitationId,
    public readonly email: Email,
    public readonly role: Role,
    public readonly invitedBy: UserId,
    public readonly status: InvitationStatus,
    public readonly rawToken: string,
    public readonly issuedAt: DateTime,
  ) {
    super(invitationEventProps(invitationId, 'InvitationIssued', issuedAt));
  }
}

export class InvitationAccepted extends DomainEvent {
  readonly eventType = 'InvitationAccepted';

  constructor(
    public readonly invitationId: InvitationId,
    public readonly phone: PhoneNumber,
    public readonly passwordHash: PasswordHash,
    public readonly fullName: string,
    public readonly acceptedAt: DateTime,
  ) {
    super(invitationEventProps(invitationId, 'InvitationAccepted', acceptedAt));
  }
}

export class InvitationRevoked extends DomainEvent {
  readonly eventType = 'InvitationRevoked';

  constructor(
    public readonly invitationId: InvitationId,
    public readonly revokedBy: UserId,
    public readonly revokedAt: DateTime,
  ) {
    super(invitationEventProps(invitationId, 'InvitationRevoked', revokedAt));
  }
}

export class InvitationExpired extends DomainEvent {
  readonly eventType = 'InvitationExpired';

  constructor(
    public readonly invitationId: InvitationId,
    public readonly expiredAt: DateTime,
  ) {
    super(invitationEventProps(invitationId, 'InvitationExpired', expiredAt));
  }
}
