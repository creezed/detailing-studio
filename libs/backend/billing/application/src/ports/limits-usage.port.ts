import type { LimitsUsage, Period } from '@det/backend-billing-domain';
import type { TenantId } from '@det/shared-types';

export const LIMITS_USAGE_PORT = Symbol('LIMITS_USAGE_PORT');

export interface ILimitsUsagePort {
  getUsage(tenantId: TenantId, period: Period): Promise<LimitsUsage>;
}
