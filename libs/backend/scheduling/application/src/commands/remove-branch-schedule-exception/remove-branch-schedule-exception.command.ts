import type { BranchId } from '@det/backend-scheduling-domain';

export class RemoveBranchScheduleExceptionCommand {
  constructor(
    public readonly branchId: BranchId,
    public readonly date: string,
  ) {}
}
