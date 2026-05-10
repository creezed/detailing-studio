import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetLowStockReportQuery } from './get-low-stock-report.query';
import { STOCK_READ_PORT } from '../../di/tokens';

import type { PaginatedResult } from '../../ports/sku-read.port';
import type { IStockReadPort } from '../../ports/stock-read.port';
import type { LowStockReadModel } from '../../read-models/stock.read-models';

@QueryHandler(GetLowStockReportQuery)
export class GetLowStockReportHandler implements IQueryHandler<GetLowStockReportQuery> {
  constructor(@Inject(STOCK_READ_PORT) private readonly port: IStockReadPort) {}

  async execute(query: GetLowStockReportQuery): Promise<PaginatedResult<LowStockReadModel>> {
    return this.port.getLowStock(query.offset, query.limit);
  }
}
