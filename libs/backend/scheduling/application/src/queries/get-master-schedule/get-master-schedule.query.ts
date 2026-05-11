import type { BranchId, MasterId } from '@det/backend-scheduling-domain';

export class GetMasterScheduleQuery {
  constructor(
    public readonly masterId: MasterId,
    public readonly branchId: BranchId,
  ) {}
}
