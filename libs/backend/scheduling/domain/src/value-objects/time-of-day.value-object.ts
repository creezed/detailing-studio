import { DomainError } from '@det/backend-shared-ddd';

export class InvalidTimeOfDayError extends DomainError {
  readonly code = 'INVALID_TIME_OF_DAY';
  readonly httpStatus = 422;

  constructor(hour: number, minute: number) {
    super(
      `Invalid time of day: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    );
  }
}

export class TimeOfDay {
  private constructor(
    public readonly hour: number,
    public readonly minute: number,
  ) {}

  static from(hour: number, minute: number): TimeOfDay {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new InvalidTimeOfDayError(hour, minute);
    }
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      throw new InvalidTimeOfDayError(hour, minute);
    }
    return new TimeOfDay(hour, minute);
  }

  toMinutes(): number {
    return this.hour * 60 + this.minute;
  }

  isBefore(other: TimeOfDay): boolean {
    return this.toMinutes() < other.toMinutes();
  }

  isAfter(other: TimeOfDay): boolean {
    return this.toMinutes() > other.toMinutes();
  }

  equals(other: TimeOfDay): boolean {
    return this.hour === other.hour && this.minute === other.minute;
  }

  toString(): string {
    return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
  }
}
