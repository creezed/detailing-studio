import type { PaginatedResult } from './sku-read.port';
import type {
  LowStockReadModel,
  StockByBranchReadModel,
  StockOnDateReadModel,
} from '../read-models/stock.read-models';

export interface IStockReadPort {
  getByBranch(
    branchId: string,
    offset: number,
    limit: number,
  ): Promise<PaginatedResult<StockByBranchReadModel>>;
  getLowStock(offset: number, limit: number): Promise<PaginatedResult<LowStockReadModel>>;
  getOnDate(branchId: string, date: string): Promise<readonly StockOnDateReadModel[]>;
}
