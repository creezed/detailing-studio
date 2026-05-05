export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class InvitationNotFoundError extends Error {
  constructor() {
    super('Invitation not found');
    this.name = 'InvitationNotFoundError';
  }
}

export class InvitationAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Pending invitation for email ${email} already exists`);
    this.name = 'InvitationAlreadyExistsError';
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    super('Password is invalid');
    this.name = 'InvalidPasswordError';
  }
}

export class ForbiddenInvitationIssuerError extends Error {
  constructor() {
    super('Only OWNER or MANAGER can issue invitations');
    this.name = 'ForbiddenInvitationIssuerError';
  }
}
