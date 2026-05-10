import type { Quantity } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

export interface StockSnapshotLine {
  readonly skuId: SkuId;
  readonly currentQuantity: Quantity;
}

export interface IStockSnapshotPort {
  snapshotForBranch(branchId: string): Promise<readonly StockSnapshotLine[]>;
}
