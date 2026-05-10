import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ListStockTakingsQuery } from './list-stock-takings.query';
import { STOCK_TAKING_READ_PORT } from '../../di/tokens';

import type { PaginatedResult } from '../../ports/sku-read.port';
import type { IStockTakingReadPort } from '../../ports/stock-taking-read.port';
import type { StockTakingListItemReadModel } from '../../read-models/stock-taking.read-models';

@QueryHandler(ListStockTakingsQuery)
export class ListStockTakingsHandler implements IQueryHandler<ListStockTakingsQuery> {
  constructor(@Inject(STOCK_TAKING_READ_PORT) private readonly port: IStockTakingReadPort) {}

  async execute(
    query: ListStockTakingsQuery,
  ): Promise<PaginatedResult<StockTakingListItemReadModel>> {
    return this.port.list({
      branchId: query.branchId,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    });
  }
}
