import { DomainError } from '@det/backend-shared-ddd';

import type { SubscriptionStatus } from '../value-objects/subscription-status';

export class InvalidSubscriptionTransitionError extends DomainError {
  readonly code = 'INVALID_SUBSCRIPTION_TRANSITION';
  readonly httpStatus = 422;

  constructor(
    public readonly from: SubscriptionStatus,
    public readonly to: SubscriptionStatus,
  ) {
    super(`Cannot transition subscription from ${from} to ${to}`);
  }
}

export class SubscriptionAlreadyCancelledError extends DomainError {
  readonly code = 'SUBSCRIPTION_ALREADY_CANCELLED';
  readonly httpStatus = 422;

  constructor() {
    super('Subscription is already cancelled');
  }
}

export class SamePlanChangeError extends DomainError {
  readonly code = 'SAME_PLAN_CHANGE';
  readonly httpStatus = 422;

  constructor(plan: string) {
    super(`Subscription is already on plan ${plan}`);
  }
}
