export interface TransferListItemReadModel {
  readonly id: string;
  readonly fromBranchId: string;
  readonly toBranchId: string;
  readonly status: string;
  readonly createdAt: string;
  readonly postedAt: string | null;
  readonly lineCount: number;
}
