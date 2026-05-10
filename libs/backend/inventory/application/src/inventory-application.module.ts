import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ApproveAdjustmentHandler } from './commands/approve-adjustment/approve-adjustment.handler';
import { CancelReceiptHandler } from './commands/cancel-receipt/cancel-receipt.handler';
import { CancelStockTakingHandler } from './commands/cancel-stock-taking/cancel-stock-taking.handler';
import { CreateAdjustmentHandler } from './commands/create-adjustment/create-adjustment.handler';
import { CreateReceiptHandler } from './commands/create-receipt/create-receipt.handler';
import { CreateSkuHandler } from './commands/create-sku/create-sku.handler';
import { CreateSupplierHandler } from './commands/create-supplier/create-supplier.handler';
import { CreateTransferHandler } from './commands/create-transfer/create-transfer.handler';
import { DeactivateSkuHandler } from './commands/deactivate-sku/deactivate-sku.handler';
import { DeactivateSupplierHandler } from './commands/deactivate-supplier/deactivate-supplier.handler';
import { PostReceiptHandler } from './commands/post-receipt/post-receipt.handler';
import { PostStockTakingHandler } from './commands/post-stock-taking/post-stock-taking.handler';
import { PostTransferHandler } from './commands/post-transfer/post-transfer.handler';
import { RecordStockTakingMeasurementHandler } from './commands/record-stock-taking-measurement/record-stock-taking-measurement.handler';
import { RejectAdjustmentHandler } from './commands/reject-adjustment/reject-adjustment.handler';
import { StartStockTakingHandler } from './commands/start-stock-taking/start-stock-taking.handler';
import { UpdateReceiptHandler } from './commands/update-receipt/update-receipt.handler';
import { UpdateSkuHandler } from './commands/update-sku/update-sku.handler';
import { UpdateSupplierContactHandler } from './commands/update-supplier-contact/update-supplier-contact.handler';
import { GetLowStockReportHandler } from './queries/get-low-stock-report/get-low-stock-report.handler';
import { GetReceiptByIdHandler } from './queries/get-receipt-by-id/get-receipt-by-id.handler';
import { GetSkuByBarcodeHandler } from './queries/get-sku-by-barcode/get-sku-by-barcode.handler';
import { GetSkuByIdHandler } from './queries/get-sku-by-id/get-sku-by-id.handler';
import { GetStockByBranchHandler } from './queries/get-stock-by-branch/get-stock-by-branch.handler';
import { GetStockOnDateHandler } from './queries/get-stock-on-date/get-stock-on-date.handler';
import { GetStockTakingByIdHandler } from './queries/get-stock-taking-by-id/get-stock-taking-by-id.handler';
import { GetSupplierByIdHandler } from './queries/get-supplier-by-id/get-supplier-by-id.handler';
import { ListAdjustmentsHandler } from './queries/list-adjustments/list-adjustments.handler';
import { ListMovementsHandler } from './queries/list-movements/list-movements.handler';
import { ListPendingApprovalsHandler } from './queries/list-pending-approvals/list-pending-approvals.handler';
import { ListReceiptsHandler } from './queries/list-receipts/list-receipts.handler';
import { ListSkusHandler } from './queries/list-skus/list-skus.handler';
import { ListStockTakingsHandler } from './queries/list-stock-takings/list-stock-takings.handler';
import { ListSuppliersHandler } from './queries/list-suppliers/list-suppliers.handler';
import { ListTransfersHandler } from './queries/list-transfers/list-transfers.handler';
import { ApplyAdjustmentSaga } from './sagas/apply-adjustment.saga';
import { ApplyReceiptCancellationSaga } from './sagas/apply-receipt-cancellation.saga';
import { ApplyReceiptSaga } from './sagas/apply-receipt.saga';
import { ApplyStockTakingSaga } from './sagas/apply-stock-taking.saga';
import { ApplyTransferSaga } from './sagas/apply-transfer.saga';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  CreateSkuHandler,
  UpdateSkuHandler,
  DeactivateSkuHandler,
  CreateSupplierHandler,
  UpdateSupplierContactHandler,
  DeactivateSupplierHandler,
  CreateReceiptHandler,
  UpdateReceiptHandler,
  PostReceiptHandler,
  CancelReceiptHandler,
  CreateAdjustmentHandler,
  ApproveAdjustmentHandler,
  RejectAdjustmentHandler,
  CreateTransferHandler,
  PostTransferHandler,
  StartStockTakingHandler,
  RecordStockTakingMeasurementHandler,
  PostStockTakingHandler,
  CancelStockTakingHandler,
];

const QUERY_HANDLERS = [
  GetSkuByIdHandler,
  GetSkuByBarcodeHandler,
  ListSkusHandler,
  GetSupplierByIdHandler,
  ListSuppliersHandler,
  ListReceiptsHandler,
  GetReceiptByIdHandler,
  ListAdjustmentsHandler,
  ListPendingApprovalsHandler,
  ListTransfersHandler,
  ListStockTakingsHandler,
  GetStockTakingByIdHandler,
  GetStockOnDateHandler,
  GetLowStockReportHandler,
  GetStockByBranchHandler,
  ListMovementsHandler,
];

const EVENT_HANDLERS = [
  ApplyReceiptSaga,
  ApplyAdjustmentSaga,
  ApplyReceiptCancellationSaga,
  ApplyTransferSaga,
  ApplyStockTakingSaga,
];

@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class InventoryApplicationModule {
  static register(
    providers: readonly Provider[],
    imports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    return {
      exports: [CqrsModule, ...providers],
      imports: [CqrsModule, ...imports],
      module: InventoryApplicationModule,
      providers: [...providers, ...COMMAND_HANDLERS, ...QUERY_HANDLERS, ...EVENT_HANDLERS],
    };
  }
}
