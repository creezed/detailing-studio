import { ValueObject } from '@det/backend-shared-ddd';

import { InvalidVinError } from '../client/client.errors';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export class Vin extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): Vin {
    const upper = value.trim().toUpperCase();

    if (!VIN_PATTERN.test(upper)) {
      throw new InvalidVinError(value);
    }

    return new Vin(upper);
  }

  get value(): string {
    return this._value;
  }

  override equals(other: this): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }
}
