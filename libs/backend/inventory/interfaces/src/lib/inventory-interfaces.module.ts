import { Module } from '@nestjs/common';

import { AdjustmentsController } from '../http/adjustments.controller';
import { ReceiptsController } from '../http/receipts.controller';
import { SkusController } from '../http/skus.controller';
import { StockTakingsController } from '../http/stock-takings.controller';
import { StockController } from '../http/stock.controller';
import { SuppliersController } from '../http/suppliers.controller';
import { TransfersController } from '../http/transfers.controller';

@Module({
  controllers: [
    AdjustmentsController,
    ReceiptsController,
    SkusController,
    StockController,
    StockTakingsController,
    SuppliersController,
    TransfersController,
  ],
})
export class InventoryInterfacesModule {}
