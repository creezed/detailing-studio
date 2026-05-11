import type { BranchId } from '@det/backend-scheduling-domain';

export class DeactivateBranchCommand {
  constructor(public readonly branchId: BranchId) {}
}
