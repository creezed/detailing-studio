import { InvalidDateTimeError } from './errors';
import { ValueObject } from './value-object';

export class DateTime extends ValueObject {
  private constructor(private readonly value: Date) {
    super();
  }

  static from(value: string | number | Date | DateTime): DateTime {
    if (value instanceof DateTime) {
      return new DateTime(value.toDate());
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new InvalidDateTimeError(value);
    }

    return new DateTime(date);
  }

  static now(): DateTime {
    return new DateTime(new Date());
  }

  iso(): string {
    return this.value.toISOString();
  }

  toDate(): Date {
    return new Date(this.value.getTime());
  }

  override equals(other: this): boolean {
    return this.value.getTime() === other.value.getTime();
  }
}
