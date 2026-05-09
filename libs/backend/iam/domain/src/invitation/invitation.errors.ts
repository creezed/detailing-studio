import { DomainError } from '@det/backend-shared-ddd';

import type { InvitationId } from './invitation-id';

export class InvitationExpiredError extends DomainError {
  readonly code = 'INVITATION_EXPIRED';
  readonly httpStatus = 410;

  constructor(public readonly invitationId: InvitationId) {
    super(`Invitation ${invitationId} has expired`);
  }
}

export class InvitationAlreadyAcceptedError extends DomainError {
  readonly code = 'INVITATION_ALREADY_ACCEPTED';
  readonly httpStatus = 409;

  constructor(public readonly invitationId: InvitationId) {
    super(`Invitation ${invitationId} is already accepted`);
  }
}

export class InvitationAlreadyRevokedError extends DomainError {
  readonly code = 'INVITATION_ALREADY_REVOKED';
  readonly httpStatus = 409;

  constructor(public readonly invitationId: InvitationId) {
    super(`Invitation ${invitationId} is already revoked`);
  }
}

export class InvalidInvitationTokenError extends DomainError {
  readonly code = 'INVALID_INVITATION_TOKEN';
  readonly httpStatus = 422;

  constructor() {
    super('Invalid invitation token');
  }
}
