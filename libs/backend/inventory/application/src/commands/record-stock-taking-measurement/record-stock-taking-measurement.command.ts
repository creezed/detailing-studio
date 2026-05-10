import type { StockTakingId } from '@det/backend-inventory-domain';
import type { Quantity } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

export class RecordStockTakingMeasurementCommand {
  constructor(
    public readonly stockTakingId: StockTakingId,
    public readonly skuId: SkuId,
    public readonly actual: Quantity,
  ) {}
}
