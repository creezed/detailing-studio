import type { BranchId, UserId } from '@det/shared-types';

export class StartStockTakingCommand {
  constructor(
    public readonly branchId: BranchId,
    public readonly createdBy: UserId,
  ) {}
}
