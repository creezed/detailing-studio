import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { ISkuRepository } from '@det/backend-inventory-domain';

import { GetSkuByIdQuery } from './get-sku-by-id.query';
import { SKU_REPOSITORY } from '../../di/tokens';
import { SkuNotFoundError } from '../../errors/application.errors';

import type { SkuDetailReadModel } from '../../read-models/sku.read-models';

@QueryHandler(GetSkuByIdQuery)
export class GetSkuByIdHandler implements IQueryHandler<GetSkuByIdQuery, SkuDetailReadModel> {
  constructor(@Inject(SKU_REPOSITORY) private readonly skuRepo: ISkuRepository) {}

  async execute(query: GetSkuByIdQuery): Promise<SkuDetailReadModel> {
    const sku = await this.skuRepo.findById(query.skuId);

    if (!sku) {
      throw new SkuNotFoundError(query.skuId);
    }

    return sku.toSnapshot();
  }
}
