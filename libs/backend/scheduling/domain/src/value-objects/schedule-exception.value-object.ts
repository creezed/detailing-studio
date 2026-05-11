import { DomainError } from '@det/backend-shared-ddd';

import type { TimeRange } from './time-range.value-object';

export class InvalidScheduleExceptionError extends DomainError {
  readonly code = 'INVALID_SCHEDULE_EXCEPTION';
  readonly httpStatus = 422;

  constructor(reason: string) {
    super(`Invalid schedule exception: ${reason}`);
  }
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ScheduleException {
  private constructor(
    public readonly date: string,
    public readonly isClosed: boolean,
    public readonly customRange: TimeRange | null,
    public readonly reason: string | null,
  ) {}

  static from(props: {
    readonly date: string;
    readonly isClosed: boolean;
    readonly customRange?: TimeRange | null;
    readonly reason?: string | null;
  }): ScheduleException {
    if (!ISO_DATE_PATTERN.test(props.date)) {
      throw new InvalidScheduleExceptionError(
        `date must be ISO format YYYY-MM-DD, got: ${props.date}`,
      );
    }

    if (props.isClosed && props.customRange != null) {
      throw new InvalidScheduleExceptionError('closed day cannot have a custom range');
    }

    return new ScheduleException(
      props.date,
      props.isClosed,
      props.customRange ?? null,
      props.reason ?? null,
    );
  }

  equals(other: ScheduleException): boolean {
    return this.date === other.date;
  }
}
