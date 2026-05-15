import { DateTime } from '@det/backend-shared-ddd';
import { SubscriptionId, TenantId } from '@det/shared-types';

import { Subscription } from './subscription.aggregate';
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
import { PlanCode } from '../value-objects/plan-code';
import { SubscriptionStatus } from '../value-objects/subscription-status';

const SUB_ID = SubscriptionId.from('00000000-0000-4000-a000-000000000001');
const TENANT_ID = TenantId.from('00000000-0000-4000-a000-000000000002');
const NOW = DateTime.from('2025-06-01T00:00:00Z');

function trialSub(overrides?: { planCode?: PlanCode; trialDurationDays?: number }): Subscription {
  const sub = Subscription.startTrial({
    id: SUB_ID,
    tenantId: TENANT_ID,
    planCode: overrides?.planCode ?? PlanCode.STARTER,
    trialDurationDays: overrides?.trialDurationDays ?? 14,
    now: NOW,
  });
  sub.pullDomainEvents();

  return sub;
}

function activeSub(): Subscription {
  const sub = Subscription.startActive({
    id: SUB_ID,
    tenantId: TENANT_ID,
    planCode: PlanCode.STANDARD,
    now: NOW,
  });
  sub.pullDomainEvents();

  return sub;
}

function pastDueSub(): Subscription {
  const sub = activeSub();
  sub.markPastDue(NOW.plusDays(30));
  sub.pullDomainEvents();

  return sub;
}

function cancelledSub(): Subscription {
  const sub = activeSub();
  sub.cancel({ by: 'owner', reason: 'test', now: NOW.plusDays(5) });
  sub.pullDomainEvents();

  return sub;
}

describe('Subscription', () => {
  describe('startTrial', () => {
    it('should create a TRIAL subscription', () => {
      const sub = Subscription.startTrial({
        id: SUB_ID,
        tenantId: TENANT_ID,
        planCode: PlanCode.STARTER,
        now: NOW,
      });

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.TRIAL);
      expect(snap.planCode).toBe(PlanCode.STARTER);
      expect(snap.trialEndsAt).not.toBeNull();
      expect(snap.trialEndsAt?.equals(NOW.plusDays(14))).toBe(true);
      expect(snap.nextBillingAt.equals(NOW.plusDays(14))).toBe(true);
      expect(snap.cancelledAt).toBeNull();
    });

    it('should emit SubscriptionStartedTrial event', () => {
      const sub = Subscription.startTrial({
        id: SUB_ID,
        tenantId: TENANT_ID,
        planCode: PlanCode.STARTER,
        now: NOW,
      });

      const events = sub.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SubscriptionStartedTrial);

      const event = events[0] as SubscriptionStartedTrial;
      expect(event.subscriptionId).toBe(SUB_ID);
      expect(event.tenantId).toBe(TENANT_ID);
      expect(event.planCode).toBe(PlanCode.STARTER);
    });

    it('should respect custom trial duration', () => {
      const sub = Subscription.startTrial({
        id: SUB_ID,
        tenantId: TENANT_ID,
        planCode: PlanCode.STARTER,
        trialDurationDays: 7,
        now: NOW,
      });

      const snap = sub.toSnapshot();
      expect(snap.trialEndsAt?.equals(NOW.plusDays(7))).toBe(true);
    });
  });

  describe('startActive', () => {
    it('should create an ACTIVE subscription', () => {
      const sub = Subscription.startActive({
        id: SUB_ID,
        tenantId: TENANT_ID,
        planCode: PlanCode.STANDARD,
        now: NOW,
      });

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.ACTIVE);
      expect(snap.trialEndsAt).toBeNull();
      expect(snap.nextBillingAt.equals(NOW.plusMonths(1))).toBe(true);
    });

    it('should emit SubscriptionActivated event', () => {
      const sub = Subscription.startActive({
        id: SUB_ID,
        tenantId: TENANT_ID,
        planCode: PlanCode.STANDARD,
        now: NOW,
      });

      const events = sub.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SubscriptionActivated);
    });
  });

  describe('markActivated (from TRIAL)', () => {
    it('should transition TRIAL → ACTIVE', () => {
      const sub = trialSub();
      const activateAt = NOW.plusDays(14);
      sub.markActivated(activateAt);

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.ACTIVE);
      expect(snap.trialEndsAt).toBeNull();
    });

    it('should set nextBillingAt = trialEndsAt + 1 month', () => {
      const sub = trialSub();
      const activateAt = NOW.plusDays(14);
      sub.markActivated(activateAt);

      const snap = sub.toSnapshot();
      const expectedNextBilling = NOW.plusDays(14).plusMonths(1);
      expect(snap.nextBillingAt.equals(expectedNextBilling)).toBe(true);
    });

    it('should emit SubscriptionActivated event', () => {
      const sub = trialSub();
      sub.markActivated(NOW.plusDays(14));

      const events = sub.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SubscriptionActivated);
    });
  });

  describe('markPastDue', () => {
    it('should transition ACTIVE → PAST_DUE', () => {
      const sub = activeSub();
      sub.markPastDue(NOW.plusDays(30));

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.PAST_DUE);
    });

    it('should transition TRIAL → PAST_DUE', () => {
      const sub = trialSub();
      sub.markPastDue(NOW.plusDays(14));

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.PAST_DUE);
    });

    it('should emit SubscriptionMovedToPastDue event', () => {
      const sub = activeSub();
      sub.markPastDue(NOW.plusDays(30));

      const events = sub.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SubscriptionMovedToPastDue);
    });

    it('should throw on CANCELLED → PAST_DUE', () => {
      const sub = cancelledSub();
      expect(() => {
        sub.markPastDue(NOW.plusDays(10));
      }).toThrow(InvalidSubscriptionTransitionError);
    });

    it('should throw on PAST_DUE → PAST_DUE', () => {
      const sub = pastDueSub();
      expect(() => {
        sub.markPastDue(NOW.plusDays(40));
      }).toThrow(InvalidSubscriptionTransitionError);
    });
  });

  describe('markActivated (reactivate from PAST_DUE)', () => {
    it('should transition PAST_DUE → ACTIVE', () => {
      const sub = pastDueSub();
      const paidUntil = NOW.plusDays(60);
      sub.markActivated(NOW.plusDays(35), paidUntil);

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.ACTIVE);
      expect(snap.nextBillingAt.equals(paidUntil)).toBe(true);
    });

    it('should emit SubscriptionReactivated event', () => {
      const sub = pastDueSub();
      const paidUntil = NOW.plusDays(60);
      sub.markActivated(NOW.plusDays(35), paidUntil);

      const events = sub.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SubscriptionReactivated);
    });

    it('should throw if paidUntil is missing when reactivating from PAST_DUE', () => {
      const sub = pastDueSub();
      expect(() => {
        sub.markActivated(NOW.plusDays(35));
      }).toThrow('paidUntil is required');
    });
  });

  describe('markActivated (invalid transitions)', () => {
    it('should throw on ACTIVE → ACTIVE', () => {
      const sub = activeSub();
      expect(() => {
        sub.markActivated(NOW.plusDays(10));
      }).toThrow(InvalidSubscriptionTransitionError);
    });

    it('should throw on CANCELLED → ACTIVE', () => {
      const sub = cancelledSub();
      expect(() => {
        sub.markActivated(NOW.plusDays(10));
      }).toThrow(InvalidSubscriptionTransitionError);
    });
  });

  describe('cancel', () => {
    it('should cancel from TRIAL', () => {
      const sub = trialSub();
      sub.cancel({ by: 'owner', reason: 'not needed', now: NOW.plusDays(3) });

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.CANCELLED);
      expect(snap.cancelledAt).not.toBeNull();
      expect(snap.cancelReason).toBe('not needed');
    });

    it('should cancel from ACTIVE', () => {
      const sub = activeSub();
      sub.cancel({ by: 'owner', reason: 'too expensive', now: NOW.plusDays(10) });

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.CANCELLED);
    });

    it('should cancel from PAST_DUE', () => {
      const sub = pastDueSub();
      sub.cancel({ by: 'system', reason: 'auto', now: NOW.plusDays(45) });

      const snap = sub.toSnapshot();
      expect(snap.status).toBe(SubscriptionStatus.CANCELLED);
    });

    it('should emit SubscriptionCancelled with previous status', () => {
      const sub = activeSub();
      sub.cancel({ by: 'owner', reason: 'test', now: NOW.plusDays(5) });

      const events = sub.pullDomainEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as SubscriptionCancelled;
      expect(event).toBeInstanceOf(SubscriptionCancelled);
      expect(event.previousStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(event.cancelledBy).toBe('owner');
      expect(event.reason).toBe('test');
    });

    it('should throw on already CANCELLED', () => {
      const sub = cancelledSub();
      expect(() => {
        sub.cancel({ by: 'owner', reason: 'again', now: NOW.plusDays(10) });
      }).toThrow(SubscriptionAlreadyCancelledError);
    });
  });

  describe('changePlan', () => {
    it('should change plan from STARTER to STANDARD', () => {
      const sub = trialSub({ planCode: PlanCode.STARTER });
      sub.changePlan({ newPlanCode: PlanCode.STANDARD, now: NOW.plusDays(1) });

      const snap = sub.toSnapshot();
      expect(snap.planCode).toBe(PlanCode.STANDARD);
    });

    it('should not change nextBillingAt', () => {
      const sub = activeSub();
      const before = sub.toSnapshot().nextBillingAt;
      sub.changePlan({ newPlanCode: PlanCode.PRO, now: NOW.plusDays(5) });

      const after = sub.toSnapshot().nextBillingAt;
      expect(before.equals(after)).toBe(true);
    });

    it('should emit SubscriptionPlanChanged event', () => {
      const sub = activeSub();
      sub.changePlan({ newPlanCode: PlanCode.PRO, now: NOW.plusDays(5) });

      const events = sub.pullDomainEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as SubscriptionPlanChanged;
      expect(event).toBeInstanceOf(SubscriptionPlanChanged);
      expect(event.previousPlan).toBe(PlanCode.STANDARD);
      expect(event.newPlan).toBe(PlanCode.PRO);
    });

    it('should throw on same plan change', () => {
      const sub = activeSub();
      expect(() => {
        sub.changePlan({ newPlanCode: PlanCode.STANDARD, now: NOW });
      }).toThrow(SamePlanChangeError);
    });

    it('should throw on CANCELLED subscription', () => {
      const sub = cancelledSub();
      expect(() => {
        sub.changePlan({ newPlanCode: PlanCode.PRO, now: NOW });
      }).toThrow(SubscriptionAlreadyCancelledError);
    });
  });

  describe('advancePeriod', () => {
    it('should advance period by 1 month', () => {
      const sub = activeSub();
      const beforeSnap = sub.toSnapshot();
      const oldNextBilling = beforeSnap.nextBillingAt;

      sub.advancePeriod({ now: oldNextBilling });

      const snap = sub.toSnapshot();
      expect(snap.currentPeriodStartedAt.equals(oldNextBilling)).toBe(true);
      expect(snap.nextBillingAt.equals(oldNextBilling.plusMonths(1))).toBe(true);
    });

    it('should emit SubscriptionPeriodAdvanced event', () => {
      const sub = activeSub();
      sub.advancePeriod({ now: NOW.plusMonths(1) });

      const events = sub.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SubscriptionPeriodAdvanced);
    });
  });

  describe('restore + toSnapshot round-trip', () => {
    it('should restore from snapshot correctly', () => {
      const sub = Subscription.startTrial({
        id: SUB_ID,
        tenantId: TENANT_ID,
        planCode: PlanCode.STARTER,
        now: NOW,
      });

      const snapshot = sub.toSnapshot();
      const restored = Subscription.restore(snapshot);
      const restoredSnapshot = restored.toSnapshot();

      expect(restoredSnapshot.id).toBe(snapshot.id);
      expect(restoredSnapshot.tenantId).toBe(snapshot.tenantId);
      expect(restoredSnapshot.planCode).toBe(snapshot.planCode);
      expect(restoredSnapshot.status).toBe(snapshot.status);
      expect(restoredSnapshot.currentPeriodStartedAt.equals(snapshot.currentPeriodStartedAt)).toBe(
        true,
      );
      expect(restoredSnapshot.nextBillingAt.equals(snapshot.nextBillingAt)).toBe(true);
    });

    it('should not emit events on restore', () => {
      const sub = Subscription.startTrial({
        id: SUB_ID,
        tenantId: TENANT_ID,
        planCode: PlanCode.STARTER,
        now: NOW,
      });

      const restored = Subscription.restore(sub.toSnapshot());
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });
});
