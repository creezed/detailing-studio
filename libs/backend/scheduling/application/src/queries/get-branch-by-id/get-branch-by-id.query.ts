import type { BranchId } from '@det/backend-scheduling-domain';

export class GetBranchByIdQuery {
  constructor(public readonly branchId: BranchId) {}
}
