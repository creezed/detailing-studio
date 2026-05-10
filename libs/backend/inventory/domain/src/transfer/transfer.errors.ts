import { DomainError } from '@det/backend-shared-ddd';

import type { TransferId } from './transfer-id';

export class SameBranchTransferError extends DomainError {
  readonly code = 'SAME_BRANCH_TRANSFER';
  readonly httpStatus = 422;

  constructor() {
    super('Source and target branches must be different');
  }
}

export class EmptyTransferError extends DomainError {
  readonly code = 'EMPTY_TRANSFER';
  readonly httpStatus = 422;

  constructor() {
    super('Transfer must have at least one line');
  }
}

export class TransferAlreadyPostedError extends DomainError {
  readonly code = 'TRANSFER_ALREADY_POSTED';
  readonly httpStatus = 422;

  constructor(public readonly transferId: TransferId) {
    super(`Transfer ${transferId} is already posted`);
  }
}

export class TransferNotDraftError extends DomainError {
  readonly code = 'TRANSFER_NOT_DRAFT';
  readonly httpStatus = 422;

  constructor(public readonly transferId: TransferId) {
    super(`Transfer ${transferId} is not in DRAFT status`);
  }
}
