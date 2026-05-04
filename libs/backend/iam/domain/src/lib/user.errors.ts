import { DomainError } from '@det/backend/shared/ddd';

import type { UserId } from './user-id';

export class InvalidEmailError extends DomainError {
  readonly code = 'INVALID_EMAIL';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid email: ${value}`);
  }
}

export class InvalidPhoneError extends DomainError {
  readonly code = 'INVALID_PHONE';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid phone: ${value}`);
  }
}

export class UserAlreadyBlockedError extends DomainError {
  readonly code = 'USER_ALREADY_BLOCKED';
  readonly httpStatus = 409;

  constructor(public readonly userId: UserId) {
    super(`User ${userId} is already blocked`);
  }
}

export class UserNotActiveError extends DomainError {
  readonly code = 'USER_NOT_ACTIVE';
  readonly httpStatus = 422;

  constructor(public readonly userId: UserId) {
    super(`User ${userId} is not active`);
  }
}

export class CannotArchiveLastOwnerError extends DomainError {
  readonly code = 'CANNOT_ARCHIVE_LAST_OWNER';
  readonly httpStatus = 422;

  constructor(public readonly userId: UserId) {
    super(`Cannot archive last owner ${userId}`);
  }
}
