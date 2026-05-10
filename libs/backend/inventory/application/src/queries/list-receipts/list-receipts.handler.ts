import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ListReceiptsQuery } from './list-receipts.query';
import { RECEIPT_READ_PORT } from '../../di/tokens';

import type { IReceiptReadPort } from '../../ports/receipt-read.port';
import type { PaginatedResult } from '../../ports/sku-read.port';
import type { ReceiptListItemReadModel } from '../../read-models/receipt.read-models';

@QueryHandler(ListReceiptsQuery)
export class ListReceiptsHandler implements IQueryHandler<ListReceiptsQuery> {
  constructor(@Inject(RECEIPT_READ_PORT) private readonly port: IReceiptReadPort) {}

  async execute(query: ListReceiptsQuery): Promise<PaginatedResult<ReceiptListItemReadModel>> {
    return this.port.list({
      branchId: query.branchId,
      fromDate: query.fromDate,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
      toDate: query.toDate,
    });
  }
}
