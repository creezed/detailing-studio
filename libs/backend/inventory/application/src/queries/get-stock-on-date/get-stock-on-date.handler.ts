import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetStockOnDateQuery } from './get-stock-on-date.query';
import { STOCK_READ_PORT } from '../../di/tokens';

import type { IStockReadPort } from '../../ports/stock-read.port';
import type { StockOnDateReadModel } from '../../read-models/stock.read-models';

@QueryHandler(GetStockOnDateQuery)
export class GetStockOnDateHandler implements IQueryHandler<GetStockOnDateQuery> {
  constructor(@Inject(STOCK_READ_PORT) private readonly port: IStockReadPort) {}

  async execute(query: GetStockOnDateQuery): Promise<readonly StockOnDateReadModel[]> {
    return this.port.getOnDate(query.branchId, query.date);
  }
}
