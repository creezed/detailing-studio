import { DomainError } from '@det/backend-shared-ddd';

import type { NotificationStatus } from './notification-status';

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'NOTIFICATION_INVALID_STATE_TRANSITION';
  readonly httpStatus = 409;

  constructor(
    public readonly from: NotificationStatus,
    public readonly to: NotificationStatus,
  ) {
    super(`Cannot transition notification from ${from} to ${to}`);
  }
}

export class MaxAttemptsReachedError extends DomainError {
  readonly code = 'NOTIFICATION_MAX_ATTEMPTS_REACHED';
  readonly httpStatus = 422;

  constructor(public readonly maxAttempts: number) {
    super(`Maximum delivery attempts (${String(maxAttempts)}) reached, use markFailed instead`);
  }
}
