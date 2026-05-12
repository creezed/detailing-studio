import type { UserId } from '@det/shared-types';

export class DeletePushSubscriptionCommand {
  constructor(
    public readonly userId: UserId,
    public readonly subscriptionId: string,
  ) {}
}
