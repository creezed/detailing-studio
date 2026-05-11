import type { BranchSchedule } from './branch-schedule.aggregate';
import type { BranchId } from '../value-objects/branch-id';
import type { ScheduleId } from '../value-objects/schedule-id';

export interface IBranchScheduleRepository {
  findById(id: ScheduleId): Promise<BranchSchedule | null>;
  findByBranchId(branchId: BranchId): Promise<BranchSchedule | null>;
  save(schedule: BranchSchedule): Promise<void>;
}
