import { DomainError } from '@det/backend-shared-ddd';

import type { AdjustmentId } from './adjustment-id';

export class AdjustmentAlreadyDecidedError extends DomainError {
  readonly code = 'ADJUSTMENT_ALREADY_DECIDED';
  readonly httpStatus = 422;

  constructor(public readonly adjustmentId: AdjustmentId) {
    super(`Adjustment ${adjustmentId} has already been decided`);
  }
}

export class EmptyAdjustmentError extends DomainError {
  readonly code = 'EMPTY_ADJUSTMENT';
  readonly httpStatus = 422;

  constructor() {
    super('Adjustment must have at least one line');
  }
}
