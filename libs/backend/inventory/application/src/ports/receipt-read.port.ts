import type { PaginatedResult } from './sku-read.port';
import type {
  ReceiptDetailReadModel,
  ReceiptListItemReadModel,
} from '../read-models/receipt.read-models';

export interface ListReceiptsFilter {
  readonly branchId?: string;
  readonly status?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly offset: number;
  readonly limit: number;
}

export interface IReceiptReadPort {
  list(filter: ListReceiptsFilter): Promise<PaginatedResult<ReceiptListItemReadModel>>;
  findById(id: string): Promise<ReceiptDetailReadModel | null>;
}
