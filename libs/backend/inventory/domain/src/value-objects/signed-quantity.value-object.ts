import { DomainError, ValueObject } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';

export class InvalidSignedQuantityError extends DomainError {
  readonly code = 'INVALID_SIGNED_QUANTITY';
  readonly httpStatus = 422;

  constructor(public readonly amount: number) {
    super(`Invalid signed quantity amount: ${amount.toString()}`);
  }
}

export class SignedQuantity extends ValueObject {
  private constructor(
    public readonly amount: number,
    public readonly unit: UnitOfMeasure,
  ) {
    super();
  }

  static of(amount: number, unit: UnitOfMeasure): SignedQuantity {
    if (!Number.isFinite(amount)) {
      throw new InvalidSignedQuantityError(amount);
    }

    return new SignedQuantity(amount, unit);
  }

  isNegative(): boolean {
    return this.amount < 0;
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  negate(): SignedQuantity {
    return new SignedQuantity(-this.amount, this.unit);
  }

  override equals(other: this): boolean {
    return this.amount === other.amount && this.unit === other.unit;
  }
}
