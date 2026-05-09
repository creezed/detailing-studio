import { InvalidDateTimeError } from './errors';

export class DateTime {
  private constructor(private readonly value: Date) {}

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

  equals(other: DateTime): boolean {
    return this.value.getTime() === other.value.getTime();
  }
}
