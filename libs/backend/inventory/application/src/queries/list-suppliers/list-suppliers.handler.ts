import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ListSuppliersQuery } from './list-suppliers.query';
import { SUPPLIER_READ_PORT } from '../../di/tokens';

import type { PaginatedResult } from '../../ports/sku-read.port';
import type { ISupplierReadPort } from '../../ports/supplier-read.port';
import type { SupplierListItemReadModel } from '../../read-models/supplier.read-models';

@QueryHandler(ListSuppliersQuery)
export class ListSuppliersHandler implements IQueryHandler<
  ListSuppliersQuery,
  PaginatedResult<SupplierListItemReadModel>
> {
  constructor(@Inject(SUPPLIER_READ_PORT) private readonly readPort: ISupplierReadPort) {}

  async execute(query: ListSuppliersQuery): Promise<PaginatedResult<SupplierListItemReadModel>> {
    return this.readPort.list({
      isActive: query.isActive,
      limit: query.limit,
      offset: query.offset,
      search: query.search,
    });
  }
}
