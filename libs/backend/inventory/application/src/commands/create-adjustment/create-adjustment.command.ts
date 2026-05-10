import type { SignedQuantity } from '@det/backend-inventory-domain';
import type { Money } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

export interface AdjustmentLineInput {
  readonly skuId: SkuId;
  readonly delta: SignedQuantity;
  readonly snapshotUnitCost: Money;
}

export class CreateAdjustmentCommand {
  constructor(
    public readonly branchId: BranchId,
    public readonly reason: string,
    public readonly lines: readonly AdjustmentLineInput[],
    public readonly createdBy: UserId,
  ) {}
}
