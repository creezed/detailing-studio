import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { GetSkuByIdQuery, SkuId, SkuNotFoundError } from '@det/backend-inventory-application';
import type { SkuDetailReadModel } from '@det/backend-inventory-application';
import type { CatalogSkuReadModel, ICatalogSkuPort } from '@det/backend-work-order-application';

@Injectable()
export class WoCatalogSkuPortAdapter implements ICatalogSkuPort {
  constructor(private readonly queryBus: QueryBus) {}

  async getMany(skuIds: readonly string[]): Promise<readonly CatalogSkuReadModel[]> {
    const result: CatalogSkuReadModel[] = [];

    for (const skuId of skuIds) {
      try {
        const sku = await this.queryBus.execute<GetSkuByIdQuery, SkuDetailReadModel>(
          new GetSkuByIdQuery(SkuId.from(skuId)),
        );

        result.push({ id: sku.id, name: sku.name, unit: sku.baseUnit });
      } catch (error) {
        if (error instanceof SkuNotFoundError) {
          continue;
        }

        throw error;
      }
    }

    return result;
  }
}
