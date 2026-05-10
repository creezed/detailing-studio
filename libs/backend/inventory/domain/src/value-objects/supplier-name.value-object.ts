import { DomainError, ValueObject } from '@det/backend-shared-ddd';

export class InvalidSupplierNameError extends DomainError {
  readonly code = 'INVALID_SUPPLIER_NAME';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid supplier name: "${value}". Must be 1–255 characters.`);
  }
}

export class SupplierName extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): SupplierName {
    const trimmed = value.trim();

    if (trimmed.length < 1 || trimmed.length > 255) {
      throw new InvalidSupplierNameError(value);
    }

    return new SupplierName(trimmed);
  }

  getValue(): string {
    return this._value;
  }

  override equals(other: this): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }
}
