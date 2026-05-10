import { ValueObject } from '@det/backend-shared-ddd';

export class LicensePlate extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): LicensePlate {
    const trimmed = value.trim().toUpperCase();

    if (trimmed.length === 0) {
      throw new Error('License plate cannot be empty');
    }

    return new LicensePlate(trimmed);
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
