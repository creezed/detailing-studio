import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import type { IInvoiceRepository } from '@det/backend-billing-domain';

import { GetInvoiceByIdQuery } from './get-invoice-by-id.query';
import { INVOICE_REPOSITORY } from '../../di/tokens';
import { InvoiceNotFoundError } from '../../errors/application.errors';

import type { InvoiceDto } from '../list-invoices/list-invoices.query';

@QueryHandler(GetInvoiceByIdQuery)
export class GetInvoiceByIdHandler implements IQueryHandler<GetInvoiceByIdQuery, InvoiceDto> {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoiceRepo: IInvoiceRepository) {}

  async execute(q: GetInvoiceByIdQuery): Promise<InvoiceDto> {
    const invoice = await this.invoiceRepo.findById(q.invoiceId);

    if (!invoice) {
      throw new InvoiceNotFoundError(q.invoiceId);
    }

    const snap = invoice.toSnapshot();

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
  }
}
