import type { BranchId, WeeklyPattern } from '@det/backend-scheduling-domain';

export class SetBranchScheduleCommand {
  constructor(
    public readonly branchId: BranchId,
    public readonly weeklyPattern: WeeklyPattern,
  ) {}
}
