import { ApplicationError } from '@det/backend-shared-ddd';

export class SkuNotFoundError extends ApplicationError {
  readonly code = 'SKU_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Sku ${id} not found`);
  }
}

export class SupplierNotFoundError extends ApplicationError {
  readonly code = 'SUPPLIER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Supplier ${id} not found`);
  }
}

export class ArticleNumberAlreadyExistsError extends ApplicationError {
  readonly code = 'ARTICLE_NUMBER_ALREADY_EXISTS';
  readonly httpStatus = 409;

  constructor(articleNumber: string) {
    super(`Sku with articleNumber ${articleNumber} already exists`);
  }
}

export class BarcodeAlreadyExistsError extends ApplicationError {
  readonly code = 'BARCODE_ALREADY_EXISTS';
  readonly httpStatus = 409;

  constructor(barcode: string) {
    super(`Sku with barcode ${barcode} already exists`);
  }
}

export class ReceiptNotFoundError extends ApplicationError {
  readonly code = 'RECEIPT_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Receipt ${id} not found`);
  }
}

export class AdjustmentNotFoundError extends ApplicationError {
  readonly code = 'ADJUSTMENT_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Adjustment ${id} not found`);
  }
}

export class ReceiptBatchesAlreadyConsumedError extends ApplicationError {
  readonly code = 'RECEIPT_BATCHES_ALREADY_CONSUMED';
  readonly httpStatus = 409;

  constructor(receiptId: string) {
    super(`Cannot cancel receipt ${receiptId}: batches have been consumed`);
  }
}

export class TransferNotFoundError extends ApplicationError {
  readonly code = 'TRANSFER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Transfer ${id} not found`);
  }
}

export class StockTakingNotFoundError extends ApplicationError {
  readonly code = 'STOCK_TAKING_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`StockTaking ${id} not found`);
  }
}
