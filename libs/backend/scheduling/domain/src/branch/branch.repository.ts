import type { Branch } from './branch.aggregate';
import type { BranchId } from '../value-objects/branch-id';

export interface IBranchRepository {
  findById(id: BranchId): Promise<Branch | null>;
  findActive(): Promise<readonly Branch[]>;
  save(branch: Branch): Promise<void>;
}
