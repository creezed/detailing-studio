import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ListAdjustmentsQuery } from './list-adjustments.query';
import { ADJUSTMENT_READ_PORT } from '../../di/tokens';

import type { IAdjustmentReadPort } from '../../ports/adjustment-read.port';
import type { PaginatedResult } from '../../ports/sku-read.port';
import type { AdjustmentListItemReadModel } from '../../read-models/adjustment.read-models';

@QueryHandler(ListAdjustmentsQuery)
export class ListAdjustmentsHandler implements IQueryHandler<ListAdjustmentsQuery> {
  constructor(@Inject(ADJUSTMENT_READ_PORT) private readonly port: IAdjustmentReadPort) {}

  async execute(
    query: ListAdjustmentsQuery,
  ): Promise<PaginatedResult<AdjustmentListItemReadModel>> {
    return this.port.list({
      branchId: query.branchId,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    });
  }
}
