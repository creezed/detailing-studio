import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ListTransfersQuery } from './list-transfers.query';
import { TRANSFER_READ_PORT } from '../../di/tokens';

import type { PaginatedResult } from '../../ports/sku-read.port';
import type { ITransferReadPort } from '../../ports/transfer-read.port';
import type { TransferListItemReadModel } from '../../read-models/transfer.read-models';

@QueryHandler(ListTransfersQuery)
export class ListTransfersHandler implements IQueryHandler<ListTransfersQuery> {
  constructor(@Inject(TRANSFER_READ_PORT) private readonly port: ITransferReadPort) {}

  async execute(query: ListTransfersQuery): Promise<PaginatedResult<TransferListItemReadModel>> {
    return this.port.list({
      branchId: query.branchId,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    });
  }
}
