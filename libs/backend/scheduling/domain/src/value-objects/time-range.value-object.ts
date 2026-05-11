import { DomainError } from '@det/backend-shared-ddd';

import type { TimeOfDay } from './time-of-day.value-object';

export class InvalidTimeRangeError extends DomainError {
  readonly code = 'INVALID_TIME_RANGE';
  readonly httpStatus = 422;

  constructor(start: string, end: string) {
    super(`Invalid time range: start (${start}) must be before end (${end})`);
  }
}

export class TimeRange {
  private constructor(
    public readonly start: TimeOfDay,
    public readonly end: TimeOfDay,
  ) {}

  static from(start: TimeOfDay, end: TimeOfDay): TimeRange {
    if (!start.isBefore(end)) {
      throw new InvalidTimeRangeError(start.toString(), end.toString());
    }
    return new TimeRange(start, end);
  }

  contains(time: TimeOfDay): boolean {
    const minutes = time.toMinutes();
    return minutes >= this.start.toMinutes() && minutes < this.end.toMinutes();
  }

  durationMinutes(): number {
    return this.end.toMinutes() - this.start.toMinutes();
  }

  equals(other: TimeRange): boolean {
    return this.start.equals(other.start) && this.end.equals(other.end);
  }

  toString(): string {
    return `${this.start.toString()}-${this.end.toString()}`;
  }
}
