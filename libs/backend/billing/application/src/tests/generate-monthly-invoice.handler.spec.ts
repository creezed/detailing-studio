import { InvoiceStatus, PlanCode } from '@det/backend-billing-domain';

import {
  FakeBillingConfig,
  FakeClock,
  FakeIdGenerator,
  FakeInvoiceRepository,
  FakeSubscriptionRepository,
  NOW,
  TENANT_ID,
  createActiveSubscription,
  createTrialSubscription,
  resetIdCounter,
} from './fakes';
import { GenerateMonthlyInvoiceCommand } from '../commands/generate-monthly-invoice/generate-monthly-invoice.command';
import { GenerateMonthlyInvoiceHandler } from '../commands/generate-monthly-invoice/generate-monthly-invoice.handler';
import { SubscriptionNotFoundError } from '../errors/application.errors';

import type { CommandBus } from '@nestjs/cqrs';

describe('GenerateMonthlyInvoiceHandler', () => {
  let handler: GenerateMonthlyInvoiceHandler;
  let subRepo: FakeSubscriptionRepository;
  let invoiceRepo: FakeInvoiceRepository;
  let config: FakeBillingConfig;
  let commandBus: CommandBus;

  beforeEach(() => {
    resetIdCounter();
    subRepo = new FakeSubscriptionRepository();
    invoiceRepo = new FakeInvoiceRepository();
    config = new FakeBillingConfig();
    commandBus = { execute: jest.fn() } as unknown as CommandBus;
    handler = new GenerateMonthlyInvoiceHandler(
      subRepo,
      invoiceRepo,
      new FakeClock(),
      new FakeIdGenerator(),
      config,
      commandBus,
    );
  });

  it('should throw SubscriptionNotFoundError when no subscription', async () => {
    await expect(handler.execute(new GenerateMonthlyInvoiceCommand(TENANT_ID))).rejects.toThrow(
      SubscriptionNotFoundError,
    );
  });

  it('should return null for CANCELLED subscription', async () => {
    const sub = createActiveSubscription();

    sub.cancel({ by: 'admin', reason: 'test', now: NOW });
    subRepo.givenSubscription(sub);

    const result = await handler.execute(new GenerateMonthlyInvoiceCommand(TENANT_ID));

    expect(result).toBeNull();
  });

  it('should return null for TRIAL subscription when trial has not ended', async () => {
    const sub = createTrialSubscription();

    subRepo.givenSubscription(sub);

    const result = await handler.execute(new GenerateMonthlyInvoiceCommand(TENANT_ID));

    expect(result).toBeNull();
  });

  it('should issue invoice for ACTIVE subscription', async () => {
    config.demoBillingAutoPay = false;

    const sub = createActiveSubscription();

    subRepo.givenSubscription(sub);

    const result = await handler.execute(new GenerateMonthlyInvoiceCommand(TENANT_ID));

    expect(result).not.toBeNull();
    expect(result?.id).toBeDefined();

    const invoices = await invoiceRepo.findBySubscriptionId(sub.id);

    expect(invoices).toHaveLength(1);

    const snap = invoices[0]?.toSnapshot();

    expect(snap?.status).toBe(InvoiceStatus.ISSUED);
    expect(snap?.planCode).toBe(PlanCode.STARTER);
  });

  it('should auto-pay in demo mode', async () => {
    config.demoBillingAutoPay = true;

    const sub = createActiveSubscription();

    subRepo.givenSubscription(sub);

    await handler.execute(new GenerateMonthlyInvoiceCommand(TENANT_ID));

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should be idempotent — returns existing invoice for same period', async () => {
    config.demoBillingAutoPay = false;

    const sub = createActiveSubscription();

    subRepo.givenSubscription(sub);

    const first = await handler.execute(new GenerateMonthlyInvoiceCommand(TENANT_ID));
    const second = await handler.execute(new GenerateMonthlyInvoiceCommand(TENANT_ID));

    expect(first?.id).toBe(second?.id);

    const invoices = await invoiceRepo.findBySubscriptionId(sub.id);

    expect(invoices).toHaveLength(1);
  });
});
