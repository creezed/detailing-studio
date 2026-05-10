import { DomainError, ValueObject } from '@det/backend-shared-ddd';

export class InvalidBarcodeError extends DomainError {
  readonly code = 'INVALID_BARCODE';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid barcode: "${value}". Must be valid EAN-13 or UPC-A.`);
  }
}

function computeCheckDigit(digits: readonly number[]): number {
  let sum = 0;

  for (let i = 0; i < digits.length - 1; i++) {
    const d = digits[i];

    if (d === undefined) {
      return -1;
    }

    sum += i % 2 === 0 ? d : d * 3;
  }

  return (10 - (sum % 10)) % 10;
}

export class Barcode extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): Barcode {
    const trimmed = value.trim();

    if (!/^\d{12,13}$/.test(trimmed)) {
      throw new InvalidBarcodeError(value);
    }

    const digits = Array.from(trimmed, Number);
    const expected = computeCheckDigit(digits);
    const actual = digits[digits.length - 1];

    if (expected !== actual) {
      throw new InvalidBarcodeError(value);
    }

    return new Barcode(trimmed);
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
