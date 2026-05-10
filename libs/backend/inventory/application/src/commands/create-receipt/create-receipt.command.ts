import type { BranchId, SupplierId, UserId } from '@det/shared-types';

export class CreateReceiptCommand {
  constructor(
    public readonly supplierId: SupplierId,
    public readonly branchId: BranchId,
    public readonly createdBy: UserId,
    public readonly supplierInvoiceNumber: string | null,
    public readonly supplierInvoiceDate: string | null,
  ) {}
}
