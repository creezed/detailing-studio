import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ListMovementsQuery } from './list-movements.query';
import { MOVEMENT_READ_PORT } from '../../di/tokens';

import type { IMovementReadPort } from '../../ports/movement-read.port';
import type { PaginatedResult } from '../../ports/sku-read.port';
import type { MovementReadModel } from '../../read-models/stock.read-models';

@QueryHandler(ListMovementsQuery)
export class ListMovementsHandler implements IQueryHandler<ListMovementsQuery> {
  constructor(@Inject(MOVEMENT_READ_PORT) private readonly port: IMovementReadPort) {}

  async execute(query: ListMovementsQuery): Promise<PaginatedResult<MovementReadModel>> {
    return this.port.list({
      branchId: query.branchId,
      fromDate: query.fromDate,
      limit: query.limit,
      offset: query.offset,
      skuId: query.skuId,
      sourceType: query.sourceType,
      toDate: query.toDate,
    });
  }
}
