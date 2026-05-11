import { Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import { calculateDeviation } from './norm-deviation-calculator';

describe('calculateDeviation', () => {
  it('actual = 100, norm = 100 → ratio 0, no threshold', () => {
    const result = calculateDeviation(
      Quantity.of(100, UnitOfMeasure.ML),
      Quantity.of(100, UnitOfMeasure.ML),
    );
    expect(result.ratio).toBe(0);
    expect(result.exceedsThreshold).toBe(false);
  });

  it('actual = 116, norm = 100 → ratio 0.16, exceeds threshold', () => {
    const result = calculateDeviation(
      Quantity.of(116, UnitOfMeasure.ML),
      Quantity.of(100, UnitOfMeasure.ML),
    );
    expect(result.ratio).toBeCloseTo(0.16, 4);
    expect(result.exceedsThreshold).toBe(true);
  });

  it('actual = 84, norm = 100 → ratio -0.16, exceeds threshold', () => {
    const result = calculateDeviation(
      Quantity.of(84, UnitOfMeasure.ML),
      Quantity.of(100, UnitOfMeasure.ML),
    );
    expect(result.ratio).toBeCloseTo(-0.16, 4);
    expect(result.exceedsThreshold).toBe(true);
  });

  it('actual = 115, norm = 100 → ratio 0.15, does NOT exceed (boundary inclusive)', () => {
    const result = calculateDeviation(
      Quantity.of(115, UnitOfMeasure.ML),
      Quantity.of(100, UnitOfMeasure.ML),
    );
    expect(result.ratio).toBeCloseTo(0.15, 4);
    expect(result.exceedsThreshold).toBe(false);
  });

  it('actual = 0, norm = 0 → ratio 0, no threshold', () => {
    const result = calculateDeviation(
      Quantity.of(0, UnitOfMeasure.ML),
      Quantity.of(0, UnitOfMeasure.ML),
    );
    expect(result.ratio).toBe(0);
    expect(result.exceedsThreshold).toBe(false);
  });

  it('actual = 1, norm = 0 → ratio Infinity, exceeds threshold', () => {
    const result = calculateDeviation(
      Quantity.of(1, UnitOfMeasure.ML),
      Quantity.of(0, UnitOfMeasure.ML),
    );
    expect(result.ratio).toBe(Infinity);
    expect(result.exceedsThreshold).toBe(true);
  });

  it('custom threshold 0.10 → actual = 111, norm = 100 exceeds', () => {
    const result = calculateDeviation(
      Quantity.of(111, UnitOfMeasure.ML),
      Quantity.of(100, UnitOfMeasure.ML),
      0.1,
    );
    expect(result.ratio).toBeCloseTo(0.11, 4);
    expect(result.exceedsThreshold).toBe(true);
  });
});
