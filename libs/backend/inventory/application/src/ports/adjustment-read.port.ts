import type { PaginatedResult } from './sku-read.port';
import type { AdjustmentListItemReadModel } from '../read-models/adjustment.read-models';

export interface ListAdjustmentsFilter {
  readonly branchId?: string;
  readonly status?: string;
  readonly offset: number;
  readonly limit: number;
}

export interface IAdjustmentReadPort {
  list(filter: ListAdjustmentsFilter): Promise<PaginatedResult<AdjustmentListItemReadModel>>;
  listPendingApprovals(
    offset: number,
    limit: number,
  ): Promise<PaginatedResult<AdjustmentListItemReadModel>>;
}
