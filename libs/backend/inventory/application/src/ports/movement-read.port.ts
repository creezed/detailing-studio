import type { PaginatedResult } from './sku-read.port';
import type { MovementReadModel } from '../read-models/stock.read-models';

export interface ListMovementsFilter {
  readonly skuId?: string;
  readonly branchId?: string;
  readonly sourceType?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly offset: number;
  readonly limit: number;
}

export interface IMovementReadPort {
  list(filter: ListMovementsFilter): Promise<PaginatedResult<MovementReadModel>>;
}
