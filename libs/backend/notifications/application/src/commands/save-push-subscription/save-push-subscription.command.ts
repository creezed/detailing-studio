import type { DateTime } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

export class SavePushSubscriptionCommand {
  constructor(
    public readonly userId: UserId,
    public readonly endpoint: string,
    public readonly keys: { readonly p256dh: string; readonly auth: string },
    public readonly userAgent: string | null,
    public readonly now: DateTime,
  ) {}
}
