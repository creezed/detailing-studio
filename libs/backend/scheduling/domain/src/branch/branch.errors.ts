import { DomainError } from '@det/backend-shared-ddd';

import type { BranchId } from '../value-objects/branch-id';

export class BranchAlreadyDeactivatedError extends DomainError {
  readonly code = 'BRANCH_ALREADY_DEACTIVATED';
  readonly httpStatus = 409;

  constructor(public readonly branchId: BranchId) {
    super(`Branch ${branchId} is already deactivated`);
  }
}

export class BranchAlreadyActiveError extends DomainError {
  readonly code = 'BRANCH_ALREADY_ACTIVE';
  readonly httpStatus = 409;

  constructor(public readonly branchId: BranchId) {
    super(`Branch ${branchId} is already active`);
  }
}

export class BranchInUseError extends DomainError {
  readonly code = 'BRANCH_IN_USE';
  readonly httpStatus = 422;

  constructor(public readonly branchId: BranchId) {
    super(`Cannot change timezone for active branch ${branchId}`);
  }
}
