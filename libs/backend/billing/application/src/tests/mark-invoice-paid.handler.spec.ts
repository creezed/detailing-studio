import { PaymentRef, SubscriptionStatus } from '@det/backend-billing-domain';
import { InvoiceId } from '@det/shared-types';

import {
  FakeClock,
  FakeInvoiceRepository,
  FakeSubscriptionRepository,
  createActiveSubscription,
  createIssuedInvoice,
} from './fakes';
import { MarkInvoicePaidCommand } from '../commands/mark-invoice-paid/mark-invoice-paid.command';
import { MarkInvoicePaidHandler } from '../commands/mark-invoice-paid/mark-invoice-paid.handler';
import { InvoiceNotFoundError } from '../errors/application.errors';

describe('MarkInvoicePaidHandler', () => {
  let handler: MarkInvoicePaidHandler;
  let invoiceRepo: FakeInvoiceRepository;
  let subRepo: FakeSubscriptionRepository;

  beforeEach(() => {
    invoiceRepo = new FakeInvoiceRepository();
    subRepo = new FakeSubscriptionRepository();
    handler = new MarkInvoicePaidHandler(invoiceRepo, subRepo, new FakeClock());
  });

  it('should throw InvoiceNotFoundError when invoice does not exist', async () => {
    const invoiceId = InvoiceId.from('c0000000-0000-4000-a000-000000000099');

    await expect(
      handler.execute(new MarkInvoicePaidCommand(invoiceId, PaymentRef.from('pay_1'))),
    ).rejects.toThrow(InvoiceNotFoundError);
  });

  it('should mark ISSUED invoice as PAID', async () => {
    const sub = createActiveSubscription();

    subRepo.givenSubscription(sub);

    const invoice = createIssuedInvoice(sub.id);

    invoiceRepo.givenInvoice(invoice);

    await handler.execute(new MarkInvoicePaidCommand(invoice.id, PaymentRef.from('pay_1')));

    const saved = await invoiceRepo.findById(invoice.id);
    const snap = saved?.toSnapshot();

    expect(snap?.status).toBe('PAID');
    expect(snap?.paymentRef).toBe('pay_1');
  });

  it('should reactivate subscription when status is PAST_DUE', async () => {
    const sub = createActiveSubscription();

    sub.markPastDue(new FakeClock().now());
    subRepo.givenSubscription(sub);

    const subSnap = sub.toSnapshot();

    expect(subSnap.status).toBe(SubscriptionStatus.PAST_DUE);

    const invoice = createIssuedInvoice(sub.id);

    invoiceRepo.givenInvoice(invoice);

    await handler.execute(new MarkInvoicePaidCommand(invoice.id, PaymentRef.from('pay_2')));

    const savedSub = await subRepo.findByTenantId(subSnap.tenantId);
    const savedSubSnap = savedSub?.toSnapshot();

    expect(savedSubSnap?.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('should advance period when subscription is ACTIVE', async () => {
    const sub = createActiveSubscription();

    subRepo.givenSubscription(sub);

    const beforeSnap = sub.toSnapshot();
    const invoice = createIssuedInvoice(sub.id);

    invoiceRepo.givenInvoice(invoice);

    await handler.execute(new MarkInvoicePaidCommand(invoice.id, PaymentRef.from('pay_3')));

    const savedSub = await subRepo.findByTenantId(beforeSnap.tenantId);
    const afterSnap = savedSub?.toSnapshot();

    expect(afterSnap?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(afterSnap?.nextBillingAt.iso()).not.toBe(beforeSnap.nextBillingAt.iso());
  });
});
