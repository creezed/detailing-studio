import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import type { IInvoiceRepository, ISubscriptionRepository } from '@det/backend-billing-domain';

import { type InvoiceDto, ListInvoicesQuery } from './list-invoices.query';
import { INVOICE_REPOSITORY, SUBSCRIPTION_REPOSITORY } from '../../di/tokens';
import { SubscriptionNotFoundError } from '../../errors/application.errors';

@QueryHandler(ListInvoicesQuery)
export class ListInvoicesHandler implements IQueryHandler<
  ListInvoicesQuery,
  readonly InvoiceDto[]
> {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subRepo: ISubscriptionRepository,
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepo: IInvoiceRepository,
  ) {}

  async execute(q: ListInvoicesQuery): Promise<readonly InvoiceDto[]> {
    const sub = await this.subRepo.findByTenantId(q.tenantId);

    if (!sub) {
      throw new SubscriptionNotFoundError(q.tenantId);
    }

    const invoices = await this.invoiceRepo.findBySubscriptionId(sub.id);

    return invoices.map((inv) => {
      const snap = inv.toSnapshot();

      return {
        id: snap.id,
        planCode: snap.planCode,
        amountCents: Number(snap.amount.cents),
        currency: snap.amount.currency,
        periodStartedAt: snap.period.startedAt.iso(),
        periodEndsAt: snap.period.endsAt.iso(),
        status: snap.status,
        issuedAt: snap.issuedAt.iso(),
        paidAt: snap.paidAt?.iso() ?? null,
      };
    });
  }
}
