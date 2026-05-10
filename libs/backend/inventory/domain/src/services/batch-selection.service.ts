import { Quantity } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import { BatchSelectionStrategy } from './batch-selection-strategy';

import type { BatchAllocation, IBatchSelector } from '../stock/batch-selector.interface';
import type { Batch } from '../stock/batch.entity';

export class BatchSelectionService implements IBatchSelector {
  constructor(private readonly _strategy: BatchSelectionStrategy) {}

  selectForConsumption(
    batches: readonly Batch[],
    amount: Quantity,
    at: DateTime,
  ): readonly BatchAllocation[] {
    const available = batches.filter((b) => !b.isExpired(at) && !b.isDepleted());
    const sorted = this.sort(available);

    const allocations: BatchAllocation[] = [];
    let remaining = amount.amount;

    for (const batch of sorted) {
      if (remaining <= 0) {
        break;
      }

      const take = Math.min(remaining, batch.remainingQuantity.amount);

      allocations.push({
        batchId: batch.id,
        quantity: Quantity.of(take, amount.unit),
        unitCost: batch.unitCost,
      });

      remaining -= take;
    }

    if (remaining > 0) {
      return allocations;
    }

    return allocations;
  }

  private sort(batches: readonly Batch[]): readonly Batch[] {
    const copy = [...batches];

    if (this._strategy === BatchSelectionStrategy.FEFO) {
      copy.sort((a, b) => {
        const expiryA = a.expiresAt === null ? Infinity : a.expiresAt.toDate().getTime();
        const expiryB = b.expiresAt === null ? Infinity : b.expiresAt.toDate().getTime();

        if (expiryA !== expiryB) {
          return expiryA - expiryB;
        }

        return a.receivedAt.toDate().getTime() - b.receivedAt.toDate().getTime();
      });
    } else {
      copy.sort((a, b) => a.receivedAt.toDate().getTime() - b.receivedAt.toDate().getTime());
    }

    return copy;
  }
}
