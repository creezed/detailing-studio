import type { UserId } from '@det/shared-types';

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol('PUSH_SUBSCRIPTION_REPOSITORY');

export interface PushSubscriptionRecord {
  readonly id: string;
  readonly userId: UserId;
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
  readonly userAgent: string | null;
  readonly createdAt: string;
}

export interface IPushSubscriptionRepository {
  findByEndpoint(endpoint: string): Promise<PushSubscriptionRecord | null>;
  save(record: PushSubscriptionRecord): Promise<void>;
  deleteById(id: string, userId: UserId): Promise<boolean>;
}
