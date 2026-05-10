import { DomainError, ValueObject } from '@det/backend-shared-ddd';

export class InvalidInnError extends DomainError {
  readonly code = 'INVALID_INN';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid INN: "${value}"`);
  }
}

const INN10_WEIGHTS = [2, 4, 10, 3, 5, 9, 4, 6, 8] as const;
const INN12_WEIGHTS_11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8] as const;
const INN12_WEIGHTS_12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8] as const;

function checkDigit(digits: readonly number[], weights: readonly number[]): number {
  let sum = 0;

  for (let i = 0; i < weights.length; i++) {
    const d = digits[i];
    const w = weights[i];

    if (d === undefined || w === undefined) {
      return -1;
    }

    sum += d * w;
  }

  return (sum % 11) % 10;
}

export class Inn extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): Inn {
    const trimmed = value.trim();

    if (!/^\d{10}$|^\d{12}$/.test(trimmed)) {
      throw new InvalidInnError(value);
    }

    const digits = Array.from(trimmed, Number);

    if (digits.length === 10) {
      const expected = checkDigit(digits, INN10_WEIGHTS);

      if (expected !== digits[9]) {
        throw new InvalidInnError(value);
      }
    } else {
      const expected11 = checkDigit(digits, INN12_WEIGHTS_11);

      if (expected11 !== digits[10]) {
        throw new InvalidInnError(value);
      }

      const expected12 = checkDigit(digits, INN12_WEIGHTS_12);

      if (expected12 !== digits[11]) {
        throw new InvalidInnError(value);
      }
    }

    return new Inn(trimmed);
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
