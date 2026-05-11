import type { BranchId } from '@det/backend-scheduling-domain';

export class UpdateBranchCommand {
  constructor(
    public readonly branchId: BranchId,
    public readonly name?: string,
    public readonly address?: string,
    public readonly timezone?: string,
  ) {}
}
