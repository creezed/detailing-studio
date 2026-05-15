import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { SubscriptionId, TenantId } from '@det/shared-types';

import {
  InvalidSubscriptionTransitionError,
  SamePlanChangeError,
  SubscriptionAlreadyCancelledError,
} from './subscription.errors';
import {
  SubscriptionActivated,
  SubscriptionCancelled,
  SubscriptionMovedToPastDue,
  SubscriptionPeriodAdvanced,
  SubscriptionPlanChanged,
  SubscriptionReactivated,
  SubscriptionStartedTrial,
} from './subscription.events';
import { SubscriptionStatus } from '../value-objects/subscription-status';

import type { PlanCode } from '../value-objects/plan-code';

export interface SubscriptionSnapshot {
  readonly id: SubscriptionId;
  readonly tenantId: TenantId;
  readonly planCode: PlanCode;
  readonly status: SubscriptionStatus;
  readonly currentPeriodStartedAt: DateTime;
  readonly nextBillingAt: DateTime;
  readonly trialEndsAt: DateTime | null;
  readonly cancelledAt: DateTime | null;
  readonly cancelReason: string | null;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export interface StartTrialProps {
  readonly id: SubscriptionId;
  readonly tenantId: TenantId;
  readonly planCode: PlanCode;
  readonly trialDurationDays?: number;
  readonly now: DateTime;
}

export interface StartActiveProps {
  readonly id: SubscriptionId;
  readonly tenantId: TenantId;
  readonly planCode: PlanCode;
  readonly now: DateTime;
}

export interface CancelProps {
  readonly by: string;
  readonly reason: string;
  readonly now: DateTime;
}

export class Subscription extends AggregateRoot<SubscriptionId> {
  private constructor(
    private readonly _id: SubscriptionId,
    private readonly _tenantId: TenantId,
    private _planCode: PlanCode,
    private _status: SubscriptionStatus,
    private _currentPeriodStartedAt: DateTime,
    private _nextBillingAt: DateTime,
    private _trialEndsAt: DateTime | null,
    private _cancelledAt: DateTime | null,
    private _cancelReason: string | null,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {
    super();
  }

  get id(): SubscriptionId {
    return this._id;
  }

  static startTrial(props: StartTrialProps): Subscription {
    const trialDays = props.trialDurationDays ?? 14;
    const trialEndsAt = props.now.plusDays(trialDays);

    const sub = new Subscription(
      props.id,
      props.tenantId,
      props.planCode,
      SubscriptionStatus.TRIAL,
      props.now,
      trialEndsAt,
      trialEndsAt,
      null,
      null,
      props.now,
      props.now,
    );

    sub.addEvent(
      new SubscriptionStartedTrial(
        props.id,
        props.tenantId,
        props.planCode,
        trialEndsAt,
        props.now,
      ),
    );

    return sub;
  }

  static startActive(props: StartActiveProps): Subscription {
    const nextBillingAt = props.now.plusMonths(1);

    const sub = new Subscription(
      props.id,
      props.tenantId,
      props.planCode,
      SubscriptionStatus.ACTIVE,
      props.now,
      nextBillingAt,
      null,
      null,
      null,
      props.now,
      props.now,
    );

    sub.addEvent(new SubscriptionActivated(props.id, props.planCode, nextBillingAt, props.now));

    return sub;
  }

  static restore(snapshot: SubscriptionSnapshot): Subscription {
    return new Subscription(
      snapshot.id,
      snapshot.tenantId,
      snapshot.planCode,
      snapshot.status,
      snapshot.currentPeriodStartedAt,
      snapshot.nextBillingAt,
      snapshot.trialEndsAt,
      snapshot.cancelledAt,
      snapshot.cancelReason,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  markActivated(now: DateTime, paidUntil?: DateTime): void {
    if (this._status === SubscriptionStatus.TRIAL) {
      const nextBilling = this._nextBillingAt.plusMonths(1);
      this._status = SubscriptionStatus.ACTIVE;
      this._trialEndsAt = null;
      this._nextBillingAt = nextBilling;
      this._updatedAt = now;
      this.addEvent(new SubscriptionActivated(this._id, this._planCode, nextBilling, now));

      return;
    }

    if (this._status === SubscriptionStatus.PAST_DUE) {
      if (!paidUntil) {
        throw new Error('paidUntil is required when reactivating from PAST_DUE');
      }

      this._status = SubscriptionStatus.ACTIVE;
      this._nextBillingAt = paidUntil;
      this._updatedAt = now;
      this.addEvent(new SubscriptionReactivated(this._id, this._planCode, paidUntil, now));

      return;
    }

    throw new InvalidSubscriptionTransitionError(this._status, SubscriptionStatus.ACTIVE);
  }

  markPastDue(now: DateTime): void {
    if (this._status !== SubscriptionStatus.TRIAL && this._status !== SubscriptionStatus.ACTIVE) {
      throw new InvalidSubscriptionTransitionError(this._status, SubscriptionStatus.PAST_DUE);
    }

    this._status = SubscriptionStatus.PAST_DUE;
    this._updatedAt = now;
    this.addEvent(new SubscriptionMovedToPastDue(this._id, now));
  }

  cancel(props: CancelProps): void {
    if (this._status === SubscriptionStatus.CANCELLED) {
      throw new SubscriptionAlreadyCancelledError();
    }

    const previousStatus = this._status;
    this._status = SubscriptionStatus.CANCELLED;
    this._cancelledAt = props.now;
    this._cancelReason = props.reason;
    this._updatedAt = props.now;
    this.addEvent(
      new SubscriptionCancelled(this._id, props.by, props.reason, previousStatus, props.now),
    );
  }

  changePlan(props: { newPlanCode: PlanCode; now: DateTime }): void {
    if (this._status === SubscriptionStatus.CANCELLED) {
      throw new SubscriptionAlreadyCancelledError();
    }

    if (this._planCode === props.newPlanCode) {
      throw new SamePlanChangeError(props.newPlanCode);
    }

    const previousPlan = this._planCode;
    this._planCode = props.newPlanCode;
    this._updatedAt = props.now;
    this.addEvent(
      new SubscriptionPlanChanged(this._id, previousPlan, props.newPlanCode, props.now),
    );
  }

  advancePeriod(props: { now: DateTime }): void {
    const newPeriodStart = this._nextBillingAt;
    const newNextBilling = this._nextBillingAt.plusMonths(1);
    this._currentPeriodStartedAt = newPeriodStart;
    this._nextBillingAt = newNextBilling;
    this._updatedAt = props.now;
    this.addEvent(
      new SubscriptionPeriodAdvanced(this._id, newPeriodStart, newNextBilling, props.now),
    );
  }

  toSnapshot(): SubscriptionSnapshot {
    return {
      id: this._id,
      tenantId: this._tenantId,
      planCode: this._planCode,
      status: this._status,
      currentPeriodStartedAt: this._currentPeriodStartedAt,
      nextBillingAt: this._nextBillingAt,
      trialEndsAt: this._trialEndsAt,
      cancelledAt: this._cancelledAt,
      cancelReason: this._cancelReason,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
