import type { TenantId } from '@det/shared-types';

export class GetCurrentSubscriptionQuery {
  constructor(public readonly tenantId: TenantId) {}
}

export interface SubscriptionDto {
  readonly id: string;
  readonly planCode: string;
  readonly planName: string;
  readonly planPriceCents: number;
  readonly status: string;
  readonly currentPeriodStartedAt: string;
  readonly nextBillingAt: string;
  readonly trialEndsAt: string | null;
  readonly cancelledAt: string | null;
}
