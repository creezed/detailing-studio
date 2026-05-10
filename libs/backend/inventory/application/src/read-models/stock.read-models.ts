export interface StockByBranchReadModel {
  readonly skuId: string;
  readonly branchId: string;
  readonly baseUnit: string;
  readonly totalQuantity: number;
  readonly averageCostCents: string;
  readonly reorderLevel: number;
  readonly batchCount: number;
}

export interface LowStockReadModel {
  readonly skuId: string;
  readonly branchId: string;
  readonly baseUnit: string;
  readonly totalQuantity: number;
  readonly reorderLevel: number;
}

export interface StockOnDateReadModel {
  readonly skuId: string;
  readonly branchId: string;
  readonly baseUnit: string;
  readonly quantity: number;
}

export interface MovementReadModel {
  readonly id: string;
  readonly skuId: string;
  readonly branchId: string;
  readonly movementType: string;
  readonly deltaAmount: number;
  readonly unit: string;
  readonly sourceDocId: string | null;
  readonly occurredAt: string;
}
