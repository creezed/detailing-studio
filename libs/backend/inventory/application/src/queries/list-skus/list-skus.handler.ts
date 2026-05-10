import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ListSkusQuery } from './list-skus.query';
import { SKU_READ_PORT } from '../../di/tokens';

import type { PaginatedResult, ISkuReadPort } from '../../ports/sku-read.port';
import type { SkuListItemReadModel } from '../../read-models/sku.read-models';

@QueryHandler(ListSkusQuery)
export class ListSkusHandler implements IQueryHandler<
  ListSkusQuery,
  PaginatedResult<SkuListItemReadModel>
> {
  constructor(@Inject(SKU_READ_PORT) private readonly readPort: ISkuReadPort) {}

  async execute(query: ListSkusQuery): Promise<PaginatedResult<SkuListItemReadModel>> {
    return this.readPort.list({
      group: query.group,
      isActive: query.isActive,
      limit: query.limit,
      offset: query.offset,
      search: query.search,
    });
  }
}
