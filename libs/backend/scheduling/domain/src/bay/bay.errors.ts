import { DomainError } from '@det/backend-shared-ddd';

import type { BayId } from '../value-objects/bay-id';

export class BayAlreadyDeactivatedError extends DomainError {
  readonly code = 'BAY_ALREADY_DEACTIVATED';
  readonly httpStatus = 409;

  constructor(public readonly bayId: BayId) {
    super(`Bay ${bayId} is already deactivated`);
  }
}

export class BayAlreadyActiveError extends DomainError {
  readonly code = 'BAY_ALREADY_ACTIVE';
  readonly httpStatus = 409;

  constructor(public readonly bayId: BayId) {
    super(`Bay ${bayId} is already active`);
  }
}
