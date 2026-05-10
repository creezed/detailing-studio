export interface StockTakingListItemReadModel {
  readonly id: string;
  readonly branchId: string;
  readonly status: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly lineCount: number;
}

export interface StockTakingLineReadModel {
  readonly skuId: string;
  readonly expectedQuantityAmount: number;
  readonly actualQuantityAmount: number | null;
  readonly unit: string;
  readonly deltaAmount: number | null;
}

export interface StockTakingDetailReadModel {
  readonly id: string;
  readonly branchId: string;
  readonly status: string;
  readonly createdBy: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly lines: readonly StockTakingLineReadModel[];
}
