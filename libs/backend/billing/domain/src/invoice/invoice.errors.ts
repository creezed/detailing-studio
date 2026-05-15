import { DomainError } from '@det/backend-shared-ddd';

export class InvoiceAlreadyPaidError extends DomainError {
  readonly code = 'INVOICE_ALREADY_PAID';
  readonly httpStatus = 422;

  constructor() {
    super('Invoice is already paid');
  }
}

export class InvoiceAlreadyVoidedError extends DomainError {
  readonly code = 'INVOICE_ALREADY_VOIDED';
  readonly httpStatus = 422;

  constructor() {
    super('Invoice is already voided');
  }
}

export class InvalidInvoiceTransitionError extends DomainError {
  readonly code = 'INVALID_INVOICE_TRANSITION';
  readonly httpStatus = 422;

  constructor(from: string, to: string) {
    super(`Cannot transition invoice from ${from} to ${to}`);
  }
}
