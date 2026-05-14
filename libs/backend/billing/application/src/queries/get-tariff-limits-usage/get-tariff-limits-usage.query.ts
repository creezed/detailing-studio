import type { LimitsUsageReport } from '@det/backend-billing-domain';
import type { TenantId } from '@det/shared-types';

export class GetTariffLimitsUsageQuery {
  constructor(public readonly tenantId: TenantId) {}
}

export type LimitsUsageReportDto = LimitsUsageReport;
