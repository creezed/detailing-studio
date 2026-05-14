import { InvoiceId, UserId } from '@det/shared-types';

import {
  FakeBillingConfig,
  FakeClock,
  FakeInvoiceRepository,
  FakePaymentProvider,
  createActiveSubscription,
  createIssuedInvoice,
} from './fakes';
import { PayInvoiceCommand } from '../commands/pay-invoice/pay-invoice.command';
import { PayInvoiceHandler } from '../commands/pay-invoice/pay-invoice.handler';
import { InvoiceNotFoundError } from '../errors/application.errors';

import type { CommandBus } from '@nestjs/cqrs';

const ACTOR = UserId.from('d0000000-0000-4000-a000-000000000001');

describe('PayInvoiceHandler', () => {
  let handler: PayInvoiceHandler;
  let invoiceRepo: FakeInvoiceRepository;
  let paymentProvider: FakePaymentProvider;
  let config: FakeBillingConfig;
  let commandBus: CommandBus;

  beforeEach(() => {
    invoiceRepo = new FakeInvoiceRepository();
    paymentProvider = new FakePaymentProvider();
    config = new FakeBillingConfig();
    commandBus = { execute: jest.fn() } as unknown as CommandBus;
    handler = new PayInvoiceHandler(
      invoiceRepo,
      paymentProvider,
      config,
      new FakeClock(),
      commandBus,
    );
  });

  it('should throw InvoiceNotFoundError when invoice does not exist', async () => {
    const invoiceId = InvoiceId.from('c0000000-0000-4000-a000-000000000099');

    await expect(handler.execute(new PayInvoiceCommand(invoiceId, ACTOR))).rejects.toThrow(
      InvoiceNotFoundError,
    );
  });

  it('should call paymentProvider.createPayment and return paymentRef', async () => {
    const sub = createActiveSubscription();
    const invoice = createIssuedInvoice(sub.id);

    invoiceRepo.givenInvoice(invoice);

    const result = await handler.execute(new PayInvoiceCommand(invoice.id, ACTOR));

    expect(result.paymentRef).toBeDefined();
    expect(typeof result.paymentRef).toBe('string');
  });

  it('should call MarkInvoicePaidCommand in demo mode', async () => {
    config.demoBillingAutoPay = true;

    const sub = createActiveSubscription();
    const invoice = createIssuedInvoice(sub.id);

    invoiceRepo.givenInvoice(invoice);

    await handler.execute(new PayInvoiceCommand(invoice.id, ACTOR));

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should NOT call MarkInvoicePaidCommand when demo auto-pay is off', async () => {
    config.demoBillingAutoPay = false;

    const sub = createActiveSubscription();
    const invoice = createIssuedInvoice(sub.id);

    invoiceRepo.givenInvoice(invoice);

    await handler.execute(new PayInvoiceCommand(invoice.id, ACTOR));

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});
