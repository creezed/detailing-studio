import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { Barcode } from '@det/backend-inventory-domain';
import type { ISkuRepository } from '@det/backend-inventory-domain';

import { GetSkuByBarcodeQuery } from './get-sku-by-barcode.query';
import { SKU_REPOSITORY } from '../../di/tokens';
import { SkuNotFoundError } from '../../errors/application.errors';

import type { SkuDetailReadModel } from '../../read-models/sku.read-models';

@QueryHandler(GetSkuByBarcodeQuery)
export class GetSkuByBarcodeHandler implements IQueryHandler<
  GetSkuByBarcodeQuery,
  SkuDetailReadModel
> {
  constructor(@Inject(SKU_REPOSITORY) private readonly skuRepo: ISkuRepository) {}

  async execute(query: GetSkuByBarcodeQuery): Promise<SkuDetailReadModel> {
    const barcode = Barcode.from(query.barcode);
    const sku = await this.skuRepo.findByBarcode(barcode);

    if (!sku) {
      throw new SkuNotFoundError(query.barcode);
    }

    return sku.toSnapshot();
  }
}
