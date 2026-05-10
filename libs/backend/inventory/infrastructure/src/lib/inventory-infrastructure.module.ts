import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, type OnModuleInit, Provider } from '@nestjs/common';

import {
  ADJUSTMENT_REPOSITORY,
  InventoryApplicationModule,
  RECEIPT_REPOSITORY,
  SKU_REPOSITORY,
  STOCK_REPOSITORY,
  STOCK_TAKING_REPOSITORY,
  SUPPLIER_REPOSITORY,
  TRANSFER_REPOSITORY,
} from '@det/backend-inventory-application';
import {
  AdjustmentApproved,
  AdjustmentCreated,
  AdjustmentRejected,
  LowStockReached,
  OutOfStockReached,
  ReceiptCancelled,
  ReceiptCreated,
  ReceiptInvoiceAttached,
  ReceiptLineAdded,
  ReceiptLineRemoved,
  ReceiptLineUpdated,
  ReceiptPosted,
  ReorderLevelChanged,
  SkuBarcodeAssigned,
  SkuBarcodeRemoved,
  SkuCreated,
  SkuDeactivated,
  SkuGroupChanged,
  SkuPackagingsUpdated,
  SkuReactivated,
  SkuRenamed,
  StockAdjusted,
  StockConsumed,
  StockOpened,
  StockReceived,
  StockTakingCancelled,
  StockTakingPosted,
  StockTakingStarted,
  StockTransferredIn,
  StockTransferredOut,
  SupplierContactUpdated,
  SupplierCreated,
  SupplierDeactivated,
  SupplierReactivated,
  TransferCancelled,
  TransferCreated,
  TransferPosted,
} from '@det/backend-inventory-domain';
import { EventTypeRegistry, OutboxModule } from '@det/backend-shared-outbox';

import { InvAdjustmentLineSchema } from '../persistence/inv-adjustment-line.schema';
import { InvAdjustmentSchema } from '../persistence/inv-adjustment.schema';
import { InvBatchSchema } from '../persistence/inv-batch.schema';
import { InvPackagingSchema } from '../persistence/inv-packaging.schema';
import { InvReceiptLineSchema } from '../persistence/inv-receipt-line.schema';
import { InvReceiptSchema } from '../persistence/inv-receipt.schema';
import { InvSkuSchema } from '../persistence/inv-sku.schema';
import { InvStockMovementSchema } from '../persistence/inv-stock-movement.schema';
import { InvStockTakingLineSchema } from '../persistence/inv-stock-taking-line.schema';
import { InvStockTakingSchema } from '../persistence/inv-stock-taking.schema';
import { InvStockSchema } from '../persistence/inv-stock.schema';
import { InvSupplierSchema } from '../persistence/inv-supplier.schema';
import { InvTransferLineSchema } from '../persistence/inv-transfer-line.schema';
import { InvTransferSchema } from '../persistence/inv-transfer.schema';
import { InvAdjustmentRepository } from '../repositories/inv-adjustment.repository';
import { InvReceiptRepository } from '../repositories/inv-receipt.repository';
import { InvSkuRepository } from '../repositories/inv-sku.repository';
import { InvStockTakingRepository } from '../repositories/inv-stock-taking.repository';
import { InvStockRepository } from '../repositories/inv-stock.repository';
import { InvSupplierRepository } from '../repositories/inv-supplier.repository';
import { InvTransferRepository } from '../repositories/inv-transfer.repository';

const INV_SCHEMAS = [
  InvSkuSchema,
  InvPackagingSchema,
  InvSupplierSchema,
  InvStockSchema,
  InvBatchSchema,
  InvStockMovementSchema,
  InvReceiptSchema,
  InvReceiptLineSchema,
  InvAdjustmentSchema,
  InvAdjustmentLineSchema,
  InvTransferSchema,
  InvTransferLineSchema,
  InvStockTakingSchema,
  InvStockTakingLineSchema,
];

const INFRASTRUCTURE_PROVIDERS: readonly Provider[] = [
  InvSkuRepository,
  InvSupplierRepository,
  InvStockRepository,
  InvReceiptRepository,
  InvAdjustmentRepository,
  InvTransferRepository,
  InvStockTakingRepository,
  { provide: SKU_REPOSITORY, useExisting: InvSkuRepository },
  { provide: SUPPLIER_REPOSITORY, useExisting: InvSupplierRepository },
  { provide: STOCK_REPOSITORY, useExisting: InvStockRepository },
  { provide: RECEIPT_REPOSITORY, useExisting: InvReceiptRepository },
  { provide: ADJUSTMENT_REPOSITORY, useExisting: InvAdjustmentRepository },
  { provide: TRANSFER_REPOSITORY, useExisting: InvTransferRepository },
  { provide: STOCK_TAKING_REPOSITORY, useExisting: InvStockTakingRepository },
];

@Module({
  exports: [InventoryApplicationModule],
  imports: [
    InventoryApplicationModule.register(INFRASTRUCTURE_PROVIDERS, [
      MikroOrmModule.forFeature(INV_SCHEMAS),
      OutboxModule,
    ]),
  ],
})
export class InventoryInfrastructureModule implements OnModuleInit {
  constructor(private readonly eventRegistry: EventTypeRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register([
      { ctor: SkuCreated, eventType: 'SkuCreated' },
      { ctor: SkuRenamed, eventType: 'SkuRenamed' },
      { ctor: SkuGroupChanged, eventType: 'SkuGroupChanged' },
      { ctor: SkuPackagingsUpdated, eventType: 'SkuPackagingsUpdated' },
      { ctor: SkuBarcodeAssigned, eventType: 'SkuBarcodeAssigned' },
      { ctor: SkuBarcodeRemoved, eventType: 'SkuBarcodeRemoved' },
      { ctor: SkuDeactivated, eventType: 'SkuDeactivated' },
      { ctor: SkuReactivated, eventType: 'SkuReactivated' },
      { ctor: SupplierCreated, eventType: 'SupplierCreated' },
      { ctor: SupplierContactUpdated, eventType: 'SupplierContactUpdated' },
      { ctor: SupplierDeactivated, eventType: 'SupplierDeactivated' },
      { ctor: SupplierReactivated, eventType: 'SupplierReactivated' },
      { ctor: StockOpened, eventType: 'StockOpened' },
      { ctor: StockReceived, eventType: 'StockReceived' },
      { ctor: StockConsumed, eventType: 'StockConsumed' },
      { ctor: StockAdjusted, eventType: 'StockAdjusted' },
      { ctor: StockTransferredOut, eventType: 'StockTransferredOut' },
      { ctor: StockTransferredIn, eventType: 'StockTransferredIn' },
      { ctor: LowStockReached, eventType: 'LowStockReached' },
      { ctor: OutOfStockReached, eventType: 'OutOfStockReached' },
      { ctor: ReorderLevelChanged, eventType: 'ReorderLevelChanged' },
      { ctor: ReceiptCreated, eventType: 'ReceiptCreated' },
      { ctor: ReceiptLineAdded, eventType: 'ReceiptLineAdded' },
      { ctor: ReceiptLineUpdated, eventType: 'ReceiptLineUpdated' },
      { ctor: ReceiptLineRemoved, eventType: 'ReceiptLineRemoved' },
      { ctor: ReceiptInvoiceAttached, eventType: 'ReceiptInvoiceAttached' },
      { ctor: ReceiptPosted, eventType: 'ReceiptPosted' },
      { ctor: ReceiptCancelled, eventType: 'ReceiptCancelled' },
      { ctor: AdjustmentCreated, eventType: 'AdjustmentCreated' },
      { ctor: AdjustmentApproved, eventType: 'AdjustmentApproved' },
      { ctor: AdjustmentRejected, eventType: 'AdjustmentRejected' },
      { ctor: TransferCreated, eventType: 'TransferCreated' },
      { ctor: TransferPosted, eventType: 'TransferPosted' },
      { ctor: TransferCancelled, eventType: 'TransferCancelled' },
      { ctor: StockTakingStarted, eventType: 'StockTakingStarted' },
      { ctor: StockTakingPosted, eventType: 'StockTakingPosted' },
      { ctor: StockTakingCancelled, eventType: 'StockTakingCancelled' },
    ]);
  }
}
