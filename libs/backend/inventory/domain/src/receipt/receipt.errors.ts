import { DomainError } from '@det/backend-shared-ddd';

import type { ReceiptId } from './receipt-id';

export class ReceiptAlreadyPostedError extends DomainError {
  readonly code = 'RECEIPT_ALREADY_POSTED';
  readonly httpStatus = 422;

  constructor(public readonly receiptId: ReceiptId) {
    super(`Receipt ${receiptId} is already posted`);
  }
}

export class ReceiptCannotEditAfterPostError extends DomainError {
  readonly code = 'RECEIPT_CANNOT_EDIT_AFTER_POST';
  readonly httpStatus = 422;

  constructor(public readonly receiptId: ReceiptId) {
    super(`Receipt ${receiptId} cannot be edited after posting`);
  }
}

export class EmptyReceiptError extends DomainError {
  readonly code = 'EMPTY_RECEIPT';
  readonly httpStatus = 422;

  constructor(public readonly receiptId: ReceiptId) {
    super(`Receipt ${receiptId} has no lines`);
  }
}

export class ReceiptNotPostedError extends DomainError {
  readonly code = 'RECEIPT_NOT_POSTED';
  readonly httpStatus = 422;

  constructor(public readonly receiptId: ReceiptId) {
    super(`Receipt ${receiptId} is not posted`);
  }
}
