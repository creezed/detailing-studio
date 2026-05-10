import type { Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId } from '@det/shared-types';

import type { Stock } from './stock.aggregate';

export interface IStockRepository {
  findByCompositeId(skuId: SkuId, branchId: BranchId): Promise<Stock | null>;
  findOrCreate(
    skuId: SkuId,
    branchId: BranchId,
    baseUnit: UnitOfMeasure,
    reorderLevel: Quantity,
  ): Promise<Stock>;
  save(stock: Stock): Promise<void>;
  findLowStock(branchId: BranchId): Promise<readonly Stock[]>;
}
