export interface AdjustmentListItemReadModel {
  readonly id: string;
  readonly branchId: string;
  readonly status: string;
  readonly reason: string;
  readonly totalAmountCents: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly approvedAt: string | null;
}
