import { DomainError } from '@det/backend-shared-ddd';

export class InvalidAddressError extends DomainError {
  readonly code = 'INVALID_ADDRESS';
  readonly httpStatus = 422;

  constructor() {
    super('Address must not be empty');
  }
}

export class Address {
  private constructor(private readonly _value: string) {}

  static from(value: string): Address {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new InvalidAddressError();
    }
    return new Address(trimmed);
  }

  getValue(): string {
    return this._value;
  }

  equals(other: Address): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
