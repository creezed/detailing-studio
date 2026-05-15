import type { SubscriptionId, TenantId } from '@det/shared-types';

import type { Subscription } from './subscription.aggregate';
import type { SubscriptionStatus } from '../value-objects/subscription-status';

export interface ISubscriptionRepository {
  findById(id: SubscriptionId): Promise<Subscription | null>;
  findByTenantId(tenantId: TenantId): Promise<Subscription | null>;
  findAllByStatus(status: SubscriptionStatus, limit: number): Promise<readonly Subscription[]>;
  save(subscription: Subscription): Promise<void>;
}
