import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ListPendingApprovalsQuery } from './list-pending-approvals.query';
import { ADJUSTMENT_READ_PORT } from '../../di/tokens';

import type { IAdjustmentReadPort } from '../../ports/adjustment-read.port';
import type { PaginatedResult } from '../../ports/sku-read.port';
import type { AdjustmentListItemReadModel } from '../../read-models/adjustment.read-models';

@QueryHandler(ListPendingApprovalsQuery)
export class ListPendingApprovalsHandler implements IQueryHandler<ListPendingApprovalsQuery> {
  constructor(@Inject(ADJUSTMENT_READ_PORT) private readonly port: IAdjustmentReadPort) {}

  async execute(
    query: ListPendingApprovalsQuery,
  ): Promise<PaginatedResult<AdjustmentListItemReadModel>> {
    return this.port.listPendingApprovals(query.offset, query.limit);
  }
}
