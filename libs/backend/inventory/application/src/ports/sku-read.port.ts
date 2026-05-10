import type { SkuListItemReadModel } from '../read-models/sku.read-models';

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
}

export interface ListSkusFilter {
  readonly group?: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly offset: number;
  readonly limit: number;
}

export interface ISkuReadPort {
  list(filter: ListSkusFilter): Promise<PaginatedResult<SkuListItemReadModel>>;
}
