import { DomainError } from '@det/backend-shared-ddd';

export class WorkOrderNotFoundError extends DomainError {
  readonly code = 'WORK_ORDER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(public readonly workOrderId: string) {
    super(`Work order ${workOrderId} not found`);
  }
}

export interface InsufficientLineInfo {
  readonly lineId: string;
  readonly skuId: string;
  readonly requested: number;
  readonly unit: string;
}

export class InsufficientStockForCloseError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK_FOR_CLOSE';
  readonly httpStatus = 422;

  constructor(public readonly insufficientLines: readonly InsufficientLineInfo[]) {
    super(`Insufficient stock for ${String(insufficientLines.length)} line(s)`);
  }
}
