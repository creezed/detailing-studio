import type { BranchId } from '@det/backend-scheduling-domain';

export class ReactivateBranchCommand {
  constructor(public readonly branchId: BranchId) {}
}
