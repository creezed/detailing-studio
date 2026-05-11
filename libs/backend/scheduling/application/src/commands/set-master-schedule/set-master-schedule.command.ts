import type { BranchId, MasterId, MasterWeeklyPattern } from '@det/backend-scheduling-domain';

export class SetMasterScheduleCommand {
  constructor(
    public readonly masterId: MasterId,
    public readonly branchId: BranchId,
    public readonly weeklyPattern: MasterWeeklyPattern,
  ) {}
}
