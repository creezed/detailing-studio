import type { InvoiceId, UserId } from '@det/shared-types';

export class PayInvoiceCommand {
  constructor(
    public readonly invoiceId: InvoiceId,
    public readonly by: UserId,
  ) {}
}
