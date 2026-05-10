import { DomainError, ValueObject } from '@det/backend-shared-ddd';

export class InvalidSkuNameError extends DomainError {
  readonly code = 'INVALID_SKU_NAME';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid SKU name: "${value}". Must be 1–255 characters.`);
  }
}

export class SkuName extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): SkuName {
    const trimmed = value.trim();

    if (trimmed.length < 1 || trimmed.length > 255) {
      throw new InvalidSkuNameError(value);
    }

    return new SkuName(trimmed);
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
