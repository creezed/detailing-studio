import type { TenantId } from '@det/shared-types';

export class GenerateMonthlyInvoiceCommand {
  constructor(public readonly tenantId: TenantId) {}
}
