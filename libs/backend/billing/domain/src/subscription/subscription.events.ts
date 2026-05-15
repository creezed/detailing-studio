import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { SubscriptionId, TenantId } from '@det/shared-types';

import type { PlanCode } from '../value-objects/plan-code';
import type { SubscriptionStatus } from '../value-objects/subscription-status';

const AGGREGATE_TYPE = 'Subscription';

function eventProps(id: SubscriptionId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: id,
    aggregateType: AGGREGATE_TYPE,
    eventId: `${eventType}:${id}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class SubscriptionStartedTrial extends DomainEvent {
  readonly eventType = 'SubscriptionStartedTrial';

  constructor(
    public readonly subscriptionId: SubscriptionId,
    public readonly tenantId: TenantId,
    public readonly planCode: PlanCode,
    public readonly trialEndsAt: DateTime,
    public readonly now: DateTime,
  ) {
    super(eventProps(subscriptionId, 'SubscriptionStartedTrial', now));
  }
}

export class SubscriptionActivated extends DomainEvent {
  readonly eventType = 'SubscriptionActivated';

  constructor(
    public readonly subscriptionId: SubscriptionId,
    public readonly planCode: PlanCode,
    public readonly nextBillingAt: DateTime,
    public readonly now: DateTime,
  ) {
    super(eventProps(subscriptionId, 'SubscriptionActivated', now));
  }
}

export class SubscriptionReactivated extends DomainEvent {
  readonly eventType = 'SubscriptionReactivated';

  constructor(
    public readonly subscriptionId: SubscriptionId,
    public readonly planCode: PlanCode,
    public readonly paidUntil: DateTime,
    public readonly now: DateTime,
  ) {
    super(eventProps(subscriptionId, 'SubscriptionReactivated', now));
  }
}

export class SubscriptionMovedToPastDue extends DomainEvent {
  readonly eventType = 'SubscriptionMovedToPastDue';

  constructor(
    public readonly subscriptionId: SubscriptionId,
    public readonly now: DateTime,
  ) {
    super(eventProps(subscriptionId, 'SubscriptionMovedToPastDue', now));
  }
}

export class SubscriptionCancelled extends DomainEvent {
  readonly eventType = 'SubscriptionCancelled';

  constructor(
    public readonly subscriptionId: SubscriptionId,
    public readonly cancelledBy: string,
    public readonly reason: string,
    public readonly previousStatus: SubscriptionStatus,
    public readonly now: DateTime,
  ) {
    super(eventProps(subscriptionId, 'SubscriptionCancelled', now));
  }
}

export class SubscriptionPlanChanged extends DomainEvent {
  readonly eventType = 'SubscriptionPlanChanged';

  constructor(
    public readonly subscriptionId: SubscriptionId,
    public readonly previousPlan: PlanCode,
    public readonly newPlan: PlanCode,
    public readonly now: DateTime,
  ) {
    super(eventProps(subscriptionId, 'SubscriptionPlanChanged', now));
  }
}

export class SubscriptionPeriodAdvanced extends DomainEvent {
  readonly eventType = 'SubscriptionPeriodAdvanced';

  constructor(
    public readonly subscriptionId: SubscriptionId,
    public readonly newPeriodStartedAt: DateTime,
    public readonly nextBillingAt: DateTime,
    public readonly now: DateTime,
  ) {
    super(eventProps(subscriptionId, 'SubscriptionPeriodAdvanced', now));
  }
}
