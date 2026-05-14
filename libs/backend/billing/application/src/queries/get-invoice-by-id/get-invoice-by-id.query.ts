import type { InvoiceId } from '@det/shared-types';

export class GetInvoiceByIdQuery {
  constructor(public readonly invoiceId: InvoiceId) {}
}
