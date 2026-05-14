import type { TenantId, UserId } from '@det/shared-types';

export class CancelSubscriptionCommand {
  constructor(
    public readonly tenantId: TenantId,
    public readonly reason: string,
    public readonly by: UserId,
  ) {}
}
