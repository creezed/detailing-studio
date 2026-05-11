import { DomainError } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { Timezone } from './timezone.value-object';

export class InvalidTimeSlotError extends DomainError {
  readonly code = 'INVALID_TIME_SLOT';
  readonly httpStatus = 422;

  constructor(reason: string) {
    super(`Invalid time slot: ${reason}`);
  }
}

export class TimeSlot {
  private constructor(
    public readonly start: DateTime,
    public readonly end: DateTime,
    public readonly timezone: Timezone,
  ) {}

  static from(start: DateTime, end: DateTime, timezone: Timezone): TimeSlot {
    const startMs = start.toDate().getTime();
    const endMs = end.toDate().getTime();

    if (startMs >= endMs) {
      throw new InvalidTimeSlotError('start must be before end');
    }

    return new TimeSlot(start, end, timezone);
  }

  durationMinutes(): number {
    return (this.end.toDate().getTime() - this.start.toDate().getTime()) / 60_000;
  }

  overlaps(other: TimeSlot): boolean {
    const thisStart = this.start.toDate().getTime();
    const thisEnd = this.end.toDate().getTime();
    const otherStart = other.start.toDate().getTime();
    const otherEnd = other.end.toDate().getTime();

    return thisStart < otherEnd && otherStart < thisEnd;
  }

  equals(other: TimeSlot): boolean {
    return (
      this.start.toDate().getTime() === other.start.toDate().getTime() &&
      this.end.toDate().getTime() === other.end.toDate().getTime() &&
      this.timezone.equals(other.timezone)
    );
  }
}
