export { InventoryApplicationModule } from './inventory-application.module';

export { CreateSkuCommand } from './commands/create-sku/create-sku.command';
export { UpdateSkuCommand } from './commands/update-sku/update-sku.command';
export { DeactivateSkuCommand } from './commands/deactivate-sku/deactivate-sku.command';
export { CreateSupplierCommand } from './commands/create-supplier/create-supplier.command';
export { UpdateSupplierContactCommand } from './commands/update-supplier-contact/update-supplier-contact.command';
export { DeactivateSupplierCommand } from './commands/deactivate-supplier/deactivate-supplier.command';

export { CreateReceiptCommand } from './commands/create-receipt/create-receipt.command';
export { UpdateReceiptCommand } from './commands/update-receipt/update-receipt.command';
export type { ReceiptLineInput } from './commands/update-receipt/update-receipt.command';
export { PostReceiptCommand } from './commands/post-receipt/post-receipt.command';
export { CancelReceiptCommand } from './commands/cancel-receipt/cancel-receipt.command';

export { CreateAdjustmentCommand } from './commands/create-adjustment/create-adjustment.command';
export type { AdjustmentLineInput } from './commands/create-adjustment/create-adjustment.command';
export { ApproveAdjustmentCommand } from './commands/approve-adjustment/approve-adjustment.command';
export { RejectAdjustmentCommand } from './commands/reject-adjustment/reject-adjustment.command';

export { CreateTransferCommand } from './commands/create-transfer/create-transfer.command';
export type { CreateTransferLineInput } from './commands/create-transfer/create-transfer.command';
export { PostTransferCommand } from './commands/post-transfer/post-transfer.command';

export { StartStockTakingCommand } from './commands/start-stock-taking/start-stock-taking.command';
export { RecordStockTakingMeasurementCommand } from './commands/record-stock-taking-measurement/record-stock-taking-measurement.command';
export { PostStockTakingCommand } from './commands/post-stock-taking/post-stock-taking.command';
export { CancelStockTakingCommand } from './commands/cancel-stock-taking/cancel-stock-taking.command';

export { GetSkuByIdQuery } from './queries/get-sku-by-id/get-sku-by-id.query';
export { GetSkuByBarcodeQuery } from './queries/get-sku-by-barcode/get-sku-by-barcode.query';
export { ListSkusQuery } from './queries/list-skus/list-skus.query';
export { GetSupplierByIdQuery } from './queries/get-supplier-by-id/get-supplier-by-id.query';
export { ListSuppliersQuery } from './queries/list-suppliers/list-suppliers.query';
export { ListReceiptsQuery } from './queries/list-receipts/list-receipts.query';
export { GetReceiptByIdQuery } from './queries/get-receipt-by-id/get-receipt-by-id.query';
export { ListAdjustmentsQuery } from './queries/list-adjustments/list-adjustments.query';
export { ListPendingApprovalsQuery } from './queries/list-pending-approvals/list-pending-approvals.query';
export { ListTransfersQuery } from './queries/list-transfers/list-transfers.query';
export { ListStockTakingsQuery } from './queries/list-stock-takings/list-stock-takings.query';
export { GetStockTakingByIdQuery } from './queries/get-stock-taking-by-id/get-stock-taking-by-id.query';
export { GetStockOnDateQuery } from './queries/get-stock-on-date/get-stock-on-date.query';
export { GetLowStockReportQuery } from './queries/get-low-stock-report/get-low-stock-report.query';
export { GetStockByBranchQuery } from './queries/get-stock-by-branch/get-stock-by-branch.query';
export { ListMovementsQuery } from './queries/list-movements/list-movements.query';

export {
  SKU_REPOSITORY,
  SUPPLIER_REPOSITORY,
  RECEIPT_REPOSITORY,
  ADJUSTMENT_REPOSITORY,
  STOCK_REPOSITORY,
  TRANSFER_REPOSITORY,
  STOCK_TAKING_REPOSITORY,
  SKU_READ_PORT,
  SUPPLIER_READ_PORT,
  RECEIPT_READ_PORT,
  ADJUSTMENT_READ_PORT,
  TRANSFER_READ_PORT,
  STOCK_TAKING_READ_PORT,
  STOCK_READ_PORT,
  MOVEMENT_READ_PORT,
  STOCK_SNAPSHOT_PORT,
  BATCH_USAGE_PORT,
  BATCH_SELECTOR,
  INVENTORY_CONFIG_PORT,
  IDEMPOTENCY_PORT,
  CLOCK,
  ID_GENERATOR,
} from './di/tokens';

export {
  SkuNotFoundError,
  SupplierNotFoundError,
  ArticleNumberAlreadyExistsError,
  BarcodeAlreadyExistsError,
  ReceiptNotFoundError,
  AdjustmentNotFoundError,
  ReceiptBatchesAlreadyConsumedError,
  TransferNotFoundError,
  StockTakingNotFoundError,
} from './errors/application.errors';

export type { SkuListItemReadModel, SkuDetailReadModel } from './read-models/sku.read-models';
export type {
  SupplierListItemReadModel,
  SupplierDetailReadModel,
} from './read-models/supplier.read-models';
export type {
  ReceiptListItemReadModel,
  ReceiptDetailReadModel,
  ReceiptLineReadModel,
} from './read-models/receipt.read-models';
export type { AdjustmentListItemReadModel } from './read-models/adjustment.read-models';
export type { TransferListItemReadModel } from './read-models/transfer.read-models';
export type {
  StockTakingListItemReadModel,
  StockTakingDetailReadModel,
  StockTakingLineReadModel,
} from './read-models/stock-taking.read-models';
export type {
  StockByBranchReadModel,
  LowStockReadModel,
  StockOnDateReadModel,
  MovementReadModel,
} from './read-models/stock.read-models';

export type { ISkuReadPort, PaginatedResult, ListSkusFilter } from './ports/sku-read.port';
export type { ISupplierReadPort, ListSuppliersFilter } from './ports/supplier-read.port';
export type { IReceiptReadPort, ListReceiptsFilter } from './ports/receipt-read.port';
export type { IAdjustmentReadPort, ListAdjustmentsFilter } from './ports/adjustment-read.port';
export type { ITransferReadPort, ListTransfersFilter } from './ports/transfer-read.port';
export type { IStockTakingReadPort, ListStockTakingsFilter } from './ports/stock-taking-read.port';
export type { IStockReadPort } from './ports/stock-read.port';
export type { IMovementReadPort, ListMovementsFilter } from './ports/movement-read.port';
export type { IStockSnapshotPort, StockSnapshotLine } from './ports/stock-snapshot.port';
export type { IBatchUsagePort } from './ports/batch-usage.port';
export type { IInventoryConfigPort } from './ports/inventory-config.port';
export type { IIdempotencyPort } from './ports/idempotency.port';

export {
  SkuId,
  SupplierId,
  ReceiptId,
  AdjustmentId,
  TransferId,
  StockTakingId,
} from '@det/backend-inventory-domain';
export type {
  ISkuRepository,
  ISupplierRepository,
  IReceiptRepository,
  IAdjustmentRepository,
  IStockRepository,
  ITransferRepository,
  IStockTakingRepository,
  IBatchSelector,
} from '@det/backend-inventory-domain';
