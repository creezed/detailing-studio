import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IInvoiceRepository, ISubscriptionRepository } from '@det/backend-billing-domain';
import { Invoice, PaymentRef, Period, Plan, SubscriptionStatus } from '@det/backend-billing-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { InvoiceId } from '@det/shared-types';

import { GenerateMonthlyInvoiceCommand } from './generate-monthly-invoice.command';
import {
  BILLING_CONFIG,
  CLOCK,
  ID_GENERATOR,
  INVOICE_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
} from '../../di/tokens';
import { SubscriptionNotFoundError } from '../../errors/application.errors';
import { MarkInvoicePaidCommand } from '../mark-invoice-paid/mark-invoice-paid.command';

import type { IBillingConfigPort } from '../../ports/billing-config.port';

@CommandHandler(GenerateMonthlyInvoiceCommand)
export class GenerateMonthlyInvoiceHandler implements ICommandHandler<
  GenerateMonthlyInvoiceCommand,
  { id: InvoiceId } | null
> {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subRepo: ISubscriptionRepository,
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepo: IInvoiceRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(BILLING_CONFIG) private readonly config: IBillingConfigPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(cmd: GenerateMonthlyInvoiceCommand): Promise<{ id: InvoiceId } | null> {
    const sub = await this.subRepo.findByTenantId(cmd.tenantId);

    if (!sub) {
      throw new SubscriptionNotFoundError(cmd.tenantId);
    }

    const snap = sub.toSnapshot();

    if (snap.status === SubscriptionStatus.CANCELLED) {
      return null;
    }

    const now = this.clock.now();

    if (
      snap.status === SubscriptionStatus.TRIAL &&
      snap.trialEndsAt &&
      now.isBefore(snap.trialEndsAt)
    ) {
      return null;
    }

    const period = new Period(snap.currentPeriodStartedAt, snap.nextBillingAt);
    const plan = Plan.byCode(snap.planCode);

    const existingInvoices = await this.invoiceRepo.findBySubscriptionId(sub.id);
    const existingForPeriod = existingInvoices.find((inv) => {
      const invSnap = inv.toSnapshot();

      return (
        invSnap.period.startedAt.equals(period.startedAt) &&
        invSnap.period.endsAt.equals(period.endsAt)
      );
    });

    if (existingForPeriod) {
      return { id: existingForPeriod.id };
    }

    const invoiceId = InvoiceId.from(this.idGen.generate());
    const invoice = Invoice.issue({
      id: invoiceId,
      subscriptionId: sub.id,
      planCode: snap.planCode,
      amount: plan.pricePerMonth,
      period,
      now,
    });

    await this.invoiceRepo.save(invoice);

    if (this.config.demoBillingAutoPay) {
      await this.commandBus.execute(
        new MarkInvoicePaidCommand(invoiceId, PaymentRef.from(`auto_${invoiceId}`)),
      );
    }

    return { id: invoiceId };
  }
}
