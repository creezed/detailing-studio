import type { PaymentRef } from '@det/backend-billing-domain';
import type { InvoiceId } from '@det/shared-types';

export class MarkInvoicePaidCommand {
  constructor(
    public readonly invoiceId: InvoiceId,
    public readonly paymentRef: PaymentRef,
  ) {}
}
