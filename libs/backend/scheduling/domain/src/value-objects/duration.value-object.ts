import { DomainError } from '@det/backend-shared-ddd';

export class InvalidDurationError extends DomainError {
  readonly code = 'INVALID_DURATION';
  readonly httpStatus = 422;

  constructor(value: number) {
    super(`Invalid duration in minutes: ${String(value)}`);
  }
}

export class Duration {
  private constructor(public readonly minutes: number) {}

  static minutes(value: number): Duration {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      throw new InvalidDurationError(value);
    }
    return new Duration(value);
  }

  static zero(): Duration {
    return new Duration(0);
  }

  equals(other: Duration): boolean {
    return this.minutes === other.minutes;
  }
}
