import type { MasterSchedule } from './master-schedule.aggregate';
import type { BranchId } from '../value-objects/branch-id';
import type { MasterId } from '../value-objects/master-id';
import type { ScheduleId } from '../value-objects/schedule-id';

export interface IMasterScheduleRepository {
  findById(id: ScheduleId): Promise<MasterSchedule | null>;
  findByMasterAndBranch(masterId: MasterId, branchId: BranchId): Promise<MasterSchedule | null>;
  findAllByBranch(branchId: BranchId): Promise<readonly MasterSchedule[]>;
  save(schedule: MasterSchedule): Promise<void>;
}
