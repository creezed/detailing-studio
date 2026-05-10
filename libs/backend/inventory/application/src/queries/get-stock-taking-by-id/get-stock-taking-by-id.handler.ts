import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetStockTakingByIdQuery } from './get-stock-taking-by-id.query';
import { STOCK_TAKING_READ_PORT } from '../../di/tokens';
import { StockTakingNotFoundError } from '../../errors/application.errors';

import type { IStockTakingReadPort } from '../../ports/stock-taking-read.port';
import type { StockTakingDetailReadModel } from '../../read-models/stock-taking.read-models';

@QueryHandler(GetStockTakingByIdQuery)
export class GetStockTakingByIdHandler implements IQueryHandler<GetStockTakingByIdQuery> {
  constructor(@Inject(STOCK_TAKING_READ_PORT) private readonly port: IStockTakingReadPort) {}

  async execute(query: GetStockTakingByIdQuery): Promise<StockTakingDetailReadModel> {
    const result = await this.port.findById(query.stockTakingId);

    if (!result) {
      throw new StockTakingNotFoundError(query.stockTakingId);
    }

    return result;
  }
}
