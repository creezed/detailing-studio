import { InvalidQuantityError, QuantityUnitMismatchError } from './errors';
import { Quantity, UnitOfMeasure } from './quantity.value-object';

describe('Quantity', () => {
  it('creates quantity with amount and unit', () => {
    const quantity = Quantity.of(10, UnitOfMeasure.ML);

    expect(quantity.amount).toBe(10);
    expect(quantity.unit).toBe(UnitOfMeasure.ML);
  });

  it('compares by amount and unit', () => {
    expect(Quantity.of(10, UnitOfMeasure.ML).equals(Quantity.of(10, UnitOfMeasure.ML))).toBe(true);
    expect(Quantity.of(10, UnitOfMeasure.ML).equals(Quantity.of(10, UnitOfMeasure.G))).toBe(false);
  });

  it('adds quantities with same unit', () => {
    expect(Quantity.of(10, UnitOfMeasure.ML).add(Quantity.of(5, UnitOfMeasure.ML)).amount).toBe(15);
  });

  it('subtracts quantities with same unit', () => {
    expect(
      Quantity.of(10, UnitOfMeasure.ML).subtract(Quantity.of(5, UnitOfMeasure.ML)).amount,
    ).toBe(5);
  });

  it('scales quantity', () => {
    expect(Quantity.of(10, UnitOfMeasure.ML).scale(1.5).amount).toBe(15);
  });

  it('throws for invalid amount', () => {
    expect(() => Quantity.of(-1, UnitOfMeasure.ML)).toThrow(InvalidQuantityError);
    expect(() => Quantity.of(Number.NaN, UnitOfMeasure.ML)).toThrow(InvalidQuantityError);
  });

  it('throws when units do not match', () => {
    expect(() => Quantity.of(10, UnitOfMeasure.ML).add(Quantity.of(1, UnitOfMeasure.G))).toThrow(
      QuantityUnitMismatchError,
    );
  });

  it('throws when subtraction result is negative', () => {
    expect(() =>
      Quantity.of(1, UnitOfMeasure.ML).subtract(Quantity.of(2, UnitOfMeasure.ML)),
    ).toThrow(InvalidQuantityError);
  });
});
