import { DomainError } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { UnavailabilityId } from './unavailability-id';

export class InvalidUnavailabilityPeriodError extends DomainError {
  readonly code = 'INVALID_UNAVAILABILITY_PERIOD';
  readonly httpStatus = 422;

  constructor(from: string, to: string) {
    super(`Unavailability period invalid: fromAt (${from}) must be before toAt (${to})`);
  }
}

export class Unavailability {
  private constructor(
    public readonly id: UnavailabilityId,
    public readonly fromAt: DateTime,
    public readonly toAt: DateTime,
    public readonly reason: string,
  ) {}

  static from(props: {
    readonly id: UnavailabilityId;
    readonly fromAt: DateTime;
    readonly toAt: DateTime;
    readonly reason: string;
  }): Unavailability {
    const fromMs = props.fromAt.toDate().getTime();
    const toMs = props.toAt.toDate().getTime();

    if (fromMs >= toMs) {
      throw new InvalidUnavailabilityPeriodError(props.fromAt.iso(), props.toAt.iso());
    }

    return new Unavailability(props.id, props.fromAt, props.toAt, props.reason);
  }

  containsTimestamp(dt: DateTime): boolean {
    const ms = dt.toDate().getTime();
    return ms >= this.fromAt.toDate().getTime() && ms < this.toAt.toDate().getTime();
  }

  overlapsWith(other: Unavailability): boolean {
    const thisFrom = this.fromAt.toDate().getTime();
    const thisTo = this.toAt.toDate().getTime();
    const otherFrom = other.fromAt.toDate().getTime();
    const otherTo = other.toAt.toDate().getTime();

    return thisFrom < otherTo && otherFrom < thisTo;
  }

  equals(other: Unavailability): boolean {
    return this.id === other.id;
  }
}
