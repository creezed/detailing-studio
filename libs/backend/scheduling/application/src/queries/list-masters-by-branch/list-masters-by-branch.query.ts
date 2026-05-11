import type { BranchId } from '@det/backend-scheduling-domain';

export class ListMastersByBranchQuery {
  constructor(public readonly branchId: BranchId) {}
}
