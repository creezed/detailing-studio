import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IInvoiceRepository, ISubscriptionRepository } from '@det/backend-billing-domain';
import { SubscriptionStatus } from '@det/backend-billing-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { MarkInvoicePaidCommand } from './mark-invoice-paid.command';
import { CLOCK, INVOICE_REPOSITORY, SUBSCRIPTION_REPOSITORY } from '../../di/tokens';
import { InvoiceNotFoundError } from '../../errors/application.errors';

@CommandHandler(MarkInvoicePaidCommand)
export class MarkInvoicePaidHandler implements ICommandHandler<MarkInvoicePaidCommand, void> {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepo: IInvoiceRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subRepo: ISubscriptionRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: MarkInvoicePaidCommand): Promise<void> {
    const invoice = await this.invoiceRepo.findById(cmd.invoiceId);

    if (!invoice) {
      throw new InvoiceNotFoundError(cmd.invoiceId);
    }

    const now = this.clock.now();
    invoice.markPaid({ paymentRef: cmd.paymentRef, now });
    await this.invoiceRepo.save(invoice);

    const invoiceSnap = invoice.toSnapshot();
    const sub = await this.subRepo.findById(invoiceSnap.subscriptionId);

    if (!sub) {
      return;
    }

    const subSnap = sub.toSnapshot();

    if (subSnap.status === SubscriptionStatus.PAST_DUE) {
      sub.markActivated(now, invoiceSnap.period.endsAt);
    } else if (subSnap.status === SubscriptionStatus.ACTIVE) {
      sub.advancePeriod({ now });
    } else if (subSnap.status === SubscriptionStatus.TRIAL) {
      sub.markActivated(now);
    }

    await this.subRepo.save(sub);
  }
}
