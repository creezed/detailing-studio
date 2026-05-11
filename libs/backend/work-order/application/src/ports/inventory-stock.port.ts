import type { Quantity } from '@det/backend-shared-ddd';

export interface IInventoryStockPort {
  getCurrentQuantity(branchId: string, skuId: string): Promise<Quantity | null>;
}
