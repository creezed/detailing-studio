import type { StockTakingId } from './stock-taking-id';
import type { StockTaking } from './stock-taking.aggregate';

export interface IStockTakingRepository {
  findById(id: StockTakingId): Promise<StockTaking | null>;
  save(stockTaking: StockTaking): Promise<void>;
}
