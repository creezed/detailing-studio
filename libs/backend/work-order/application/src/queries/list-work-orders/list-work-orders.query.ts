import type { WorkOrderStatus } from '@det/backend-work-order-domain';

export interface ListWorkOrdersFilter {
  readonly branchId?: string;
  readonly masterId?: string;
  readonly clientId?: string;
  readonly status?: WorkOrderStatus;
  readonly dateRange?: {
    readonly from: string;
    readonly to: string;
  };
}

export class ListWorkOrdersQuery {
  constructor(
    public readonly filter: ListWorkOrdersFilter = {},
    public readonly limit = 50,
    public readonly cursor?: string,
  ) {}
}
