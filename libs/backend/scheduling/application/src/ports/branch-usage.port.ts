import type { BranchId } from '@det/backend-scheduling-domain';

export interface IBranchUsagePort {
  hasActiveAppointments(branchId: BranchId): Promise<boolean>;
}
