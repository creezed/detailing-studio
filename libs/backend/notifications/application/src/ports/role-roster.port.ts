import type { BranchId, UserId } from '@det/shared-types';

export interface IRoleRosterPort {
  getUserIdsByRoleAndBranch(role: 'OWNER' | 'MANAGER', branchId: BranchId): Promise<UserId[]>;
  getOwnerUserIds(): Promise<UserId[]>;
}

export const ROLE_ROSTER_PORT = Symbol('ROLE_ROSTER_PORT');
