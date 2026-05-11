import type { MasterScheduleReadModel } from '../read-models/scheduling.read-models';

export interface IMasterScheduleReadPort {
  getByMasterAndBranch(masterId: string, branchId: string): Promise<MasterScheduleReadModel | null>;
  listByBranch(branchId: string): Promise<readonly MasterScheduleReadModel[]>;
}
