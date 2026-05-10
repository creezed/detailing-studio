export interface ReceiptListItemReadModel {
  readonly id: string;
  readonly supplierId: string;
  readonly branchId: string;
  readonly status: string;
  readonly createdAt: string;
  readonly postedAt: string | null;
  readonly lineCount: number;
}

export interface ReceiptLineReadModel {
  readonly id: string;
  readonly skuId: string;
  readonly packagingId: string | null;
  readonly packageQuantity: number;
  readonly baseQuantityAmount: number;
  readonly baseUnit: string;
  readonly unitCostCents: string;
  readonly expiresAt: string | null;
}

export interface ReceiptDetailReadModel {
  readonly id: string;
  readonly supplierId: string;
  readonly branchId: string;
  readonly status: string;
  readonly invoiceNumber: string | null;
  readonly invoiceDate: string | null;
  readonly attachmentUrl: string | null;
  readonly createdBy: string;
  readonly postedBy: string | null;
  readonly createdAt: string;
  readonly postedAt: string | null;
  readonly lines: readonly ReceiptLineReadModel[];
}
