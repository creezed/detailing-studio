import { DomainError, ValueObject } from '@det/backend-shared-ddd';

export class InvalidSkuGroupError extends DomainError {
  readonly code = 'INVALID_SKU_GROUP';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid SKU group: "${value}". Must be 1–100 characters.`);
  }
}

export class SkuGroup extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): SkuGroup {
    const trimmed = value.trim();

    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new InvalidSkuGroupError(value);
    }

    return new SkuGroup(trimmed);
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
