import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IInvoiceRepository, PaymentRef } from '@det/backend-billing-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { PayInvoiceCommand } from './pay-invoice.command';
import { BILLING_CONFIG, CLOCK, INVOICE_REPOSITORY, PAYMENT_PROVIDER } from '../../di/tokens';
import { InvoiceNotFoundError } from '../../errors/application.errors';
import { MarkInvoicePaidCommand } from '../mark-invoice-paid/mark-invoice-paid.command';

import type { IBillingConfigPort } from '../../ports/billing-config.port';
import type { IPaymentProviderPort } from '../../ports/payment-provider.port';

@CommandHandler(PayInvoiceCommand)
export class PayInvoiceHandler implements ICommandHandler<
  PayInvoiceCommand,
  { paymentRef: PaymentRef; redirectUrl: string | null }
> {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepo: IInvoiceRepository,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: IPaymentProviderPort,
    @Inject(BILLING_CONFIG) private readonly config: IBillingConfigPort,
    @Inject(CLOCK) private readonly clock: IClock,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    cmd: PayInvoiceCommand,
  ): Promise<{ paymentRef: PaymentRef; redirectUrl: string | null }> {
    const invoice = await this.invoiceRepo.findById(cmd.invoiceId);

    if (!invoice) {
      throw new InvoiceNotFoundError(cmd.invoiceId);
    }

    const snap = invoice.toSnapshot();
    const { paymentRef, redirectUrl } = await this.paymentProvider.createPayment({
      amount: snap.amount,
      description: `Subscription invoice ${snap.id}`,
      idempotencyKey: snap.id,
    });

    if (this.config.demoBillingAutoPay) {
      await this.commandBus.execute(new MarkInvoicePaidCommand(snap.id, paymentRef));
    }

    return { paymentRef, redirectUrl };
  }
}
