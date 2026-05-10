import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetStockByBranchQuery } from './get-stock-by-branch.query';
import { STOCK_READ_PORT } from '../../di/tokens';

import type { PaginatedResult } from '../../ports/sku-read.port';
import type { IStockReadPort } from '../../ports/stock-read.port';
import type { StockByBranchReadModel } from '../../read-models/stock.read-models';

@QueryHandler(GetStockByBranchQuery)
export class GetStockByBranchHandler implements IQueryHandler<GetStockByBranchQuery> {
  constructor(@Inject(STOCK_READ_PORT) private readonly port: IStockReadPort) {}

  async execute(query: GetStockByBranchQuery): Promise<PaginatedResult<StockByBranchReadModel>> {
    return this.port.getByBranch(query.branchId, query.offset, query.limit);
  }
}
