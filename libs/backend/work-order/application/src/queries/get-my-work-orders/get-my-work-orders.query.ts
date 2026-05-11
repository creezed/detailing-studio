import type { WorkOrderStatus } from '@det/backend-work-order-domain';

export class GetMyWorkOrdersQuery {
  constructor(
    public readonly masterId: string,
    public readonly statuses: readonly WorkOrderStatus[] = [],
    public readonly date?: string,
  ) {}
}
