import type { BranchId } from '@det/backend-scheduling-domain';

export class ListBaysByBranchQuery {
  constructor(public readonly branchId: BranchId) {}
}
