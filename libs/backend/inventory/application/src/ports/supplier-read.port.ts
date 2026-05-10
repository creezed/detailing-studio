import type { PaginatedResult } from './sku-read.port';
import type { SupplierListItemReadModel } from '../read-models/supplier.read-models';

export interface ListSuppliersFilter {
  readonly isActive?: boolean;
  readonly search?: string;
  readonly offset: number;
  readonly limit: number;
}

export interface ISupplierReadPort {
  list(filter: ListSuppliersFilter): Promise<PaginatedResult<SupplierListItemReadModel>>;
}
