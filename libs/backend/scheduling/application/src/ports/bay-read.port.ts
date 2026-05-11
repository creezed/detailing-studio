import type { BayReadModel } from '../read-models/scheduling.read-models';

export interface IBayReadPort {
  listByBranch(branchId: string): Promise<readonly BayReadModel[]>;
}
