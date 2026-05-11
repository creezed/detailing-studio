import type { BranchId } from '@det/backend-scheduling-domain';

export class GetBranchScheduleQuery {
  constructor(public readonly branchId: BranchId) {}
}
