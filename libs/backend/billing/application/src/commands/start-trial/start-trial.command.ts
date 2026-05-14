import type { TenantId } from '@det/shared-types';

export class StartTrialCommand {
  constructor(public readonly tenantId: TenantId) {}
}
