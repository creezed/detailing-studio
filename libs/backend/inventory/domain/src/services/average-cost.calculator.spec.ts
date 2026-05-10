import { AverageCostCalculator } from './average-cost.calculator';
import { BatchBuilder } from '../testing/batch.builder';

describe('AverageCostCalculator', () => {
  const calculator = new AverageCostCalculator();

  it('should return Money.rub(0) for empty batches', () => {
    const result = calculator.calculate([]);

    expect(result.cents).toBe(0n);
  });

  it('should return unitCost of single batch', () => {
    const batch = new BatchBuilder().withQuantity(100).withUnitCost(50).build();

    const result = calculator.calculate([batch]);

    expect(result.cents).toBe(5000n);
  });

  it('should calculate weighted average for two batches', () => {
    const b1 = new BatchBuilder().withQuantity(100).withUnitCost(50).build();
    const b2 = new BatchBuilder().withQuantity(200).withUnitCost(80).build();

    // (100*5000 + 200*8000) / 300 = (500000 + 1600000) / 300 = 2100000 / 300 = 7000 cents = 70 RUB
    const result = calculator.calculate([b1, b2]);

    expect(result.cents).toBe(7000n);
  });

  it('should handle batches with different costs', () => {
    const b1 = new BatchBuilder().withQuantity(50).withUnitCost(100).build();
    const b2 = new BatchBuilder().withQuantity(150).withUnitCost(200).build();

    // (50*10000 + 150*20000) / 200 = (500000 + 3000000) / 200 = 3500000 / 200 = 17500 cents = 175 RUB
    const result = calculator.calculate([b1, b2]);

    expect(result.cents).toBe(17500n);
  });

  it('should return zero for all-depleted batches', () => {
    const b1 = new BatchBuilder().withQuantity(0).build();

    const result = calculator.calculate([b1]);

    expect(result.cents).toBe(0n);
  });

  it('should ignore depleted batches in average', () => {
    const depleted = new BatchBuilder().withQuantity(0).withUnitCost(999).build();
    const active = new BatchBuilder().withQuantity(100).withUnitCost(50).build();

    const result = calculator.calculate([depleted, active]);

    expect(result.cents).toBe(5000n);
  });
});
