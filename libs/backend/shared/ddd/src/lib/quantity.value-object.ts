import { InvalidQuantityError, QuantityUnitMismatchError } from './errors';
import { ValueObject } from './value-object';

export enum UnitOfMeasure {
  G = 'G',
  KG = 'KG',
  L = 'L',
  M = 'M',
  ML = 'ML',
  PCS = 'PCS',
}

export class Quantity extends ValueObject {
  private constructor(
    public readonly amount: number,
    public readonly unit: UnitOfMeasure,
  ) {
    super();
  }

  static of(amount: number, unit: UnitOfMeasure): Quantity {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new InvalidQuantityError(amount);
    }

    return new Quantity(amount, unit);
  }

  override equals(other: this): boolean {
    return this.amount === other.amount && this.unit === other.unit;
  }

  add(other: Quantity): Quantity {
    this.ensureSameUnit(other);

    return new Quantity(this.amount + other.amount, this.unit);
  }

  subtract(other: Quantity): Quantity {
    this.ensureSameUnit(other);

    const result = this.amount - other.amount;

    if (result < 0) {
      throw new InvalidQuantityError(result);
    }

    return new Quantity(result, this.unit);
  }

  scale(factor: number): Quantity {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new InvalidQuantityError(factor);
    }

    return new Quantity(this.amount * factor, this.unit);
  }

  private ensureSameUnit(other: Quantity): void {
    if (this.unit !== other.unit) {
      throw new QuantityUnitMismatchError();
    }
  }
}
