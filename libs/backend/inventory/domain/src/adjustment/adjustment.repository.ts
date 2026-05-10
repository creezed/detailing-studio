import type { BranchId } from '@det/shared-types';

import type { AdjustmentId } from './adjustment-id';
import type { Adjustment } from './adjustment.aggregate';

export interface IAdjustmentRepository {
  findById(id: AdjustmentId): Promise<Adjustment | null>;
  save(adjustment: Adjustment): Promise<void>;
  findPendingApprovals(branchId?: BranchId): Promise<readonly Adjustment[]>;
}
