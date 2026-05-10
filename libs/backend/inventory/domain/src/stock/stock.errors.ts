import { DomainError } from '@det/backend-shared-ddd';
import type { Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import type { BatchId } from './batch-id';
import type { StockId } from './stock-id';

export class BatchInsufficientError extends DomainError {
  readonly code = 'BATCH_INSUFFICIENT';
  readonly httpStatus = 422;

  constructor(
    public readonly batchId: BatchId,
    public readonly remaining: Quantity,
    public readonly requested: Quantity,
  ) {
    super(
      `Batch ${batchId}: remaining ${remaining.amount.toString()} < requested ${requested.amount.toString()}`,
    );
  }
}

export class InsufficientStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';
  readonly httpStatus = 422;

  constructor(
    public readonly stockId: StockId,
    public readonly available: Quantity,
    public readonly requested: Quantity,
  ) {
    super(
      `Stock ${stockId as string}: available ${available.amount.toString()} < requested ${requested.amount.toString()}`,
    );
  }
}

export class UnitMismatchError extends DomainError {
  readonly code = 'UNIT_MISMATCH';
  readonly httpStatus = 422;

  constructor(
    public readonly got: UnitOfMeasure,
    public readonly expected: UnitOfMeasure,
  ) {
    super(`Unit mismatch: got ${got}, expected ${expected}`);
  }
}
