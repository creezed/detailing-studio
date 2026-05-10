import type { PaginatedResult } from './sku-read.port';
import type { TransferListItemReadModel } from '../read-models/transfer.read-models';

export interface ListTransfersFilter {
  readonly branchId?: string;
  readonly status?: string;
  readonly offset: number;
  readonly limit: number;
}

export interface ITransferReadPort {
  list(filter: ListTransfersFilter): Promise<PaginatedResult<TransferListItemReadModel>>;
}
