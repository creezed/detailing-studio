import { DomainError } from '@det/backend-shared-ddd';

export class InvalidTimezoneError extends DomainError {
  readonly code = 'INVALID_TIMEZONE';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid IANA timezone: ${value}`);
  }
}

const VALID_TIMEZONES: ReadonlySet<string> = new Set(Intl.supportedValuesOf('timeZone'));

export class Timezone {
  private constructor(private readonly _value: string) {}

  static from(value: string): Timezone {
    if (!VALID_TIMEZONES.has(value)) {
      throw new InvalidTimezoneError(value);
    }
    return new Timezone(value);
  }

  getValue(): string {
    return this._value;
  }

  equals(other: Timezone): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
