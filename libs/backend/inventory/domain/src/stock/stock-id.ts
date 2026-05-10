import type { Brand, BranchId, SkuId } from '@det/shared-types';

export type StockId = Brand<string, 'StockId'>;

export const StockId = {
  of(skuId: SkuId, branchId: BranchId): StockId {
    return `${skuId}::${branchId}` as unknown as StockId;
  },

  skuId(stockId: StockId): string {
    const [skuId] = (stockId as string).split('::');

    return skuId ?? '';
  },

  branchId(stockId: StockId): string {
    const parts = (stockId as string).split('::');

    return parts[1] ?? '';
  },
};
