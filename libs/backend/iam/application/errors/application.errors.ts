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

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class RefreshTokenReuseError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Refresh token reuse detected for session ${sessionId}`);
    this.name = 'RefreshTokenReuseError';
  }
}

export class OtpNotFoundError extends Error {
  constructor() {
    super('OTP request not found or expired');
    this.name = 'OtpNotFoundError';
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super('Refresh session not found');
    this.name = 'SessionNotFoundError';
  }
}

export class SessionExpiredError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Refresh session ${sessionId} has expired`);
    this.name = 'SessionExpiredError';
  }
}
