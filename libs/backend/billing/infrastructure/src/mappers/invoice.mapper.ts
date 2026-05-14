import { Invoice, PaymentRef, Period } from '@det/backend-billing-domain';
import type { InvoiceSnapshot, InvoiceStatus, PlanCode } from '@det/backend-billing-domain';
import { DateTime, Money } from '@det/backend-shared-ddd';
import { InvoiceId, SubscriptionId } from '@det/shared-types';

import { BilInvoiceSchema } from '../persistence/bil-invoice.schema';

export function mapInvoiceToDomain(schema: BilInvoiceSchema): Invoice {
  const snapshot: InvoiceSnapshot = {
    amount: Money.rub(Number(schema.amountCents) / 100),
    id: InvoiceId.from(schema.id),
    issuedAt: DateTime.from(schema.issuedAt),
    paidAt: schema.paidAt ? DateTime.from(schema.paidAt) : null,
    paymentRef: schema.paymentRef ? PaymentRef.from(schema.paymentRef) : null,
    period: new Period(DateTime.from(schema.periodStartedAt), DateTime.from(schema.periodEndsAt)),
    planCode: schema.planCode as PlanCode,
    status: schema.status as InvoiceStatus,
    subscriptionId: SubscriptionId.from(schema.subscriptionId),
    voidedAt: schema.voidedAt ? DateTime.from(schema.voidedAt) : null,
  };

  return Invoice.restore(snapshot);
}

export function mapInvoiceToPersistence(
  domain: Invoice,
  existing: BilInvoiceSchema | null,
): BilInvoiceSchema {
  const schema = existing ?? new BilInvoiceSchema();
  const snap = domain.toSnapshot();

  schema.id = snap.id;
  schema.subscriptionId = snap.subscriptionId;
  schema.planCode = snap.planCode;
  schema.amountCents = snap.amount.cents.toString();
  schema.currency = 'RUB';
  schema.periodStartedAt = snap.period.startedAt.toDate();
  schema.periodEndsAt = snap.period.endsAt.toDate();
  schema.status = snap.status;
  schema.issuedAt = snap.issuedAt.toDate();
  schema.paidAt = snap.paidAt?.toDate() ?? null;
  schema.voidedAt = snap.voidedAt?.toDate() ?? null;
  schema.paymentRef = snap.paymentRef ?? null;

  return schema;
}
