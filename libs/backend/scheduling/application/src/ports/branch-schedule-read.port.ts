import type { BranchScheduleReadModel } from '../read-models/scheduling.read-models';

export interface IBranchScheduleReadPort {
  getByBranchId(branchId: string): Promise<BranchScheduleReadModel | null>;
}
