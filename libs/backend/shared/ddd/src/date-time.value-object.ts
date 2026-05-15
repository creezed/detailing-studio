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

  plusDays(days: number): DateTime {
    const d = new Date(this.value.getTime());
    d.setUTCDate(d.getUTCDate() + days);

    return DateTime.from(d);
  }

  plusMonths(months: number): DateTime {
    const d = new Date(this.value.getTime());
    const originalDay = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + months);
    if (d.getUTCDate() !== originalDay) {
      d.setUTCDate(0);
    }

    return DateTime.from(d);
  }

  isBefore(other: DateTime): boolean {
    return this.value.getTime() < other.value.getTime();
  }

  isAfter(other: DateTime): boolean {
    return this.value.getTime() > other.value.getTime();
  }

  getTime(): number {
    return this.value.getTime();
  }

  override equals(other: this): boolean {
    return this.value.getTime() === other.value.getTime();
  }
}
