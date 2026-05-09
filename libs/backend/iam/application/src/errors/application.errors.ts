import { ApplicationError } from '@det/backend-shared-ddd';

export class UserAlreadyExistsError extends ApplicationError {
  readonly code = 'USER_ALREADY_EXISTS';
  readonly httpStatus = 409;

  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}

export class PhoneAlreadyExistsError extends ApplicationError {
  readonly code = 'PHONE_ALREADY_EXISTS';
  readonly httpStatus = 409;

  constructor(phone: string) {
    super(`User with phone ${phone} already exists`);
  }
}

export class UserNotFoundError extends ApplicationError {
  readonly code = 'USER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(userId: string) {
    super(`User ${userId} not found`);
  }
}

export class InvitationNotFoundError extends ApplicationError {
  readonly code = 'INVITATION_NOT_FOUND';
  readonly httpStatus = 404;

  constructor() {
    super('Invitation not found');
  }
}

export class InvitationAlreadyExistsError extends ApplicationError {
  readonly code = 'INVITATION_ALREADY_EXISTS';
  readonly httpStatus = 409;

  constructor(email: string) {
    super(`Pending invitation for email ${email} already exists`);
  }
}

export class InvalidPasswordError extends ApplicationError {
  readonly code = 'INVALID_PASSWORD';
  readonly httpStatus = 422;

  constructor() {
    super('Password is invalid');
  }
}

export class ForbiddenInvitationIssuerError extends ApplicationError {
  readonly code = 'FORBIDDEN_INVITATION_ISSUER';
  readonly httpStatus = 403;

  constructor() {
    super('Only OWNER or MANAGER can issue invitations');
  }
}

export class InvalidCredentialsError extends ApplicationError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly httpStatus = 401;

  constructor() {
    super('Invalid credentials');
  }
}

export class RefreshTokenReuseError extends ApplicationError {
  readonly code = 'REFRESH_TOKEN_REUSE';
  readonly httpStatus = 401;

  constructor(public readonly sessionId: string) {
    super(`Refresh token reuse detected for session ${sessionId}`);
  }
}

export class OtpNotFoundError extends ApplicationError {
  readonly code = 'OTP_NOT_FOUND';
  readonly httpStatus = 404;

  constructor() {
    super('OTP request not found or expired');
  }
}

export class SessionNotFoundError extends ApplicationError {
  readonly code = 'SESSION_NOT_FOUND';
  readonly httpStatus = 401;

  constructor() {
    super('Refresh session not found');
  }
}

export class SessionExpiredError extends ApplicationError {
  readonly code = 'SESSION_EXPIRED';
  readonly httpStatus = 401;

  constructor(public readonly sessionId: string) {
    super(`Refresh session ${sessionId} has expired`);
  }
}
