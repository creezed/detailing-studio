import type { DateTime, Money, Quantity } from '@det/backend-shared-ddd';

import type { BatchId } from './batch-id';
import type { Batch } from './batch.entity';

export interface BatchAllocation {
  readonly batchId: BatchId;
  readonly quantity: Quantity;
  readonly unitCost: Money;
}

export interface IBatchSelector {
  selectForConsumption(
    batches: readonly Batch[],
    amount: Quantity,
    at: DateTime,
  ): readonly BatchAllocation[];
}
