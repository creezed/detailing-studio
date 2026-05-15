import type { DateTime } from '@det/backend-shared-ddd';
import { ValueObject } from '@det/backend-shared-ddd';

export class Period extends ValueObject {
  constructor(
    public readonly startedAt: DateTime,
    public readonly endsAt: DateTime,
  ) {
    super();

    if (!endsAt.isAfter(startedAt)) {
      throw new Error('Period endsAt must be after startedAt');
    }
  }

  contains(t: DateTime): boolean {
    return !t.isBefore(this.startedAt) && t.isBefore(this.endsAt);
  }

  override equals(other: this): boolean {
    return this.startedAt.equals(other.startedAt) && this.endsAt.equals(other.endsAt);
  }
}
