import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import type { Quantity } from '@det/backend-shared-ddd';

import { GetCurrentStockForBranchQuery } from './get-current-stock.query';
import { INVENTORY_STOCK_PORT } from '../../di/tokens';

import type { IInventoryStockPort } from '../../ports/inventory-stock.port';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetCurrentStockForBranchQuery)
export class GetCurrentStockForBranchHandler implements IQueryHandler<
  GetCurrentStockForBranchQuery,
  ReadonlyMap<string, Quantity | null>
> {
  constructor(@Inject(INVENTORY_STOCK_PORT) private readonly stockPort: IInventoryStockPort) {}

  async execute(
    query: GetCurrentStockForBranchQuery,
  ): Promise<ReadonlyMap<string, Quantity | null>> {
    const entries = await Promise.all(
      query.skuIds.map(async (skuId) => {
        const qty = await this.stockPort.getCurrentQuantity(query.branchId, skuId);
        return [skuId, qty] as const;
      }),
    );

    return new Map(entries);
  }
}
