import type { BranchId, ScheduleException } from '@det/backend-scheduling-domain';

export class AddBranchScheduleExceptionCommand {
  constructor(
    public readonly branchId: BranchId,
    public readonly exception: ScheduleException,
  ) {}
}
