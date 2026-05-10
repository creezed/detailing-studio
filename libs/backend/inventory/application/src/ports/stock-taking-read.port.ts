import type { PaginatedResult } from './sku-read.port';
import type {
  StockTakingDetailReadModel,
  StockTakingListItemReadModel,
} from '../read-models/stock-taking.read-models';

export interface ListStockTakingsFilter {
  readonly branchId?: string;
  readonly status?: string;
  readonly offset: number;
  readonly limit: number;
}

export interface IStockTakingReadPort {
  list(filter: ListStockTakingsFilter): Promise<PaginatedResult<StockTakingListItemReadModel>>;
  findById(id: string): Promise<StockTakingDetailReadModel | null>;
}
