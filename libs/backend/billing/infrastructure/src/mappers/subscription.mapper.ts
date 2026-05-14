import { Subscription } from '@det/backend-billing-domain';
import type {
  PlanCode,
  SubscriptionSnapshot,
  SubscriptionStatus,
} from '@det/backend-billing-domain';
import { DateTime } from '@det/backend-shared-ddd';
import { SubscriptionId, TenantId } from '@det/shared-types';

import { BilSubscriptionSchema } from '../persistence/bil-subscription.schema';

export function mapSubscriptionToDomain(schema: BilSubscriptionSchema): Subscription {
  const snapshot: SubscriptionSnapshot = {
    cancelReason: schema.cancelReason,
    cancelledAt: schema.cancelledAt ? DateTime.from(schema.cancelledAt) : null,
    createdAt: DateTime.from(schema.createdAt),
    currentPeriodStartedAt: DateTime.from(schema.currentPeriodStartedAt),
    id: SubscriptionId.from(schema.id),
    nextBillingAt: DateTime.from(schema.nextBillingAt),
    planCode: schema.planCode as PlanCode,
    status: schema.status as SubscriptionStatus,
    tenantId: TenantId.from(schema.tenantId),
    trialEndsAt: schema.trialEndsAt ? DateTime.from(schema.trialEndsAt) : null,
    updatedAt: DateTime.from(schema.updatedAt),
  };

  return Subscription.restore(snapshot);
}

export function mapSubscriptionToPersistence(
  domain: Subscription,
  existing: BilSubscriptionSchema | null,
): BilSubscriptionSchema {
  const schema = existing ?? new BilSubscriptionSchema();
  const snap = domain.toSnapshot();

  schema.id = snap.id;
  schema.tenantId = snap.tenantId;
  schema.planCode = snap.planCode;
  schema.status = snap.status;
  schema.currentPeriodStartedAt = snap.currentPeriodStartedAt.toDate();
  schema.nextBillingAt = snap.nextBillingAt.toDate();
  schema.trialEndsAt = snap.trialEndsAt?.toDate() ?? null;
  schema.cancelledAt = snap.cancelledAt?.toDate() ?? null;
  schema.cancelReason = snap.cancelReason;
  schema.createdAt = snap.createdAt.toDate();
  schema.updatedAt = snap.updatedAt.toDate();

  return schema;
}
