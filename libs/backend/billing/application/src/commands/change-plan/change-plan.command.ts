import type { PlanCode } from '@det/backend-billing-domain';
import type { TenantId, UserId } from '@det/shared-types';

export class ChangePlanCommand {
  constructor(
    public readonly tenantId: TenantId,
    public readonly newPlanCode: PlanCode,
    public readonly by: UserId,
  ) {}
}
