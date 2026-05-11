import { DomainError } from '@det/backend-shared-ddd';

import { TimeRange } from './time-range.value-object';

import type { TimeOfDay } from './time-of-day.value-object';

export class InvalidWorkingDayError extends DomainError {
  readonly code = 'INVALID_WORKING_DAY';
  readonly httpStatus = 422;

  constructor(reason: string) {
    super(`Invalid working day: ${reason}`);
  }
}

export class WorkingDay {
  private constructor(
    public readonly open: TimeOfDay,
    public readonly close: TimeOfDay,
    public readonly breakStart: TimeOfDay | null,
    public readonly breakEnd: TimeOfDay | null,
  ) {}

  static from(props: {
    readonly open: TimeOfDay;
    readonly close: TimeOfDay;
    readonly breakStart?: TimeOfDay | null;
    readonly breakEnd?: TimeOfDay | null;
  }): WorkingDay {
    const breakStart = props.breakStart ?? null;
    const breakEnd = props.breakEnd ?? null;

    if (!props.open.isBefore(props.close)) {
      throw new InvalidWorkingDayError('open must be before close');
    }

    if ((breakStart === null) !== (breakEnd === null)) {
      throw new InvalidWorkingDayError('breakStart and breakEnd must both be set or both be null');
    }

    if (breakStart !== null && breakEnd !== null) {
      if (!breakStart.isBefore(breakEnd)) {
        throw new InvalidWorkingDayError('breakStart must be before breakEnd');
      }
      if (breakStart.toMinutes() <= props.open.toMinutes()) {
        throw new InvalidWorkingDayError('breakStart must be after open');
      }
      if (breakEnd.toMinutes() >= props.close.toMinutes()) {
        throw new InvalidWorkingDayError('breakEnd must be before close');
      }
    }

    return new WorkingDay(props.open, props.close, breakStart, breakEnd);
  }

  toTimeRanges(): readonly TimeRange[] {
    if (this.breakStart === null || this.breakEnd === null) {
      return [TimeRange.from(this.open, this.close)];
    }
    return [TimeRange.from(this.open, this.breakStart), TimeRange.from(this.breakEnd, this.close)];
  }

  containsTime(time: TimeOfDay): boolean {
    return this.toTimeRanges().some((range) => range.contains(time));
  }

  equals(other: WorkingDay): boolean {
    return (
      this.open.equals(other.open) &&
      this.close.equals(other.close) &&
      (this.breakStart === null
        ? other.breakStart === null
        : other.breakStart !== null && this.breakStart.equals(other.breakStart)) &&
      (this.breakEnd === null
        ? other.breakEnd === null
        : other.breakEnd !== null && this.breakEnd.equals(other.breakEnd))
    );
  }
}
