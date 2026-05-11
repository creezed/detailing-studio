import type { Bay } from './bay.aggregate';
import type { BayId } from '../value-objects/bay-id';
import type { BranchId } from '../value-objects/branch-id';

export interface IBayRepository {
  findById(id: BayId): Promise<Bay | null>;
  findByBranch(branchId: BranchId): Promise<readonly Bay[]>;
  save(bay: Bay): Promise<void>;
}
