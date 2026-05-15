import type { InvoiceId, SubscriptionId } from '@det/shared-types';

import type { Invoice } from './invoice.aggregate';

export interface IInvoiceRepository {
  findById(id: InvoiceId): Promise<Invoice | null>;
  findBySubscriptionId(subscriptionId: SubscriptionId): Promise<readonly Invoice[]>;
  findUnpaidBySubscription(subscriptionId: SubscriptionId): Promise<readonly Invoice[]>;
  save(invoice: Invoice): Promise<void>;
}
