import type { DateTime } from '@det/backend-shared-ddd';

export interface DeliveryAttempt {
  readonly attemptNo: number;
  readonly attemptedAt: DateTime;
  readonly error: string | null;
  readonly providerId: string | null;
}

export interface DeliveryAttemptSnapshot {
  readonly attemptNo: number;
  readonly attemptedAt: string;
  readonly error: string | null;
  readonly providerId: string | null;
}
