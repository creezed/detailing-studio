import type { Quantity } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

export interface CreateTransferLineInput {
  readonly skuId: SkuId;
  readonly quantity: Quantity;
}

export class CreateTransferCommand {
  constructor(
    public readonly fromBranchId: BranchId,
    public readonly toBranchId: BranchId,
    public readonly lines: readonly CreateTransferLineInput[],
    public readonly createdBy: UserId,
  ) {}
}
