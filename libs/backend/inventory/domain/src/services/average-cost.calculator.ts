import { Money } from '@det/backend-shared-ddd';

import type { Batch } from '../stock/batch.entity';

export class AverageCostCalculator {
  calculate(batches: readonly Batch[]): Money {
    if (batches.length === 0) {
      return Money.rub(0);
    }

    let totalCostCents = 0n;
    let totalAmount = 0n;

    for (const batch of batches) {
      const qty = BigInt(Math.round(batch.remainingQuantity.amount));

      totalCostCents += batch.unitCost.cents * qty;
      totalAmount += qty;
    }

    if (totalAmount === 0n) {
      return Money.rub(0);
    }

    const avgCents = totalCostCents / totalAmount;
    const rubles = avgCents / 100n;
    const cents = avgCents % 100n;

    return Money.rub(`${rubles.toString()}.${cents.toString().padStart(2, '0')}`);
  }
}
