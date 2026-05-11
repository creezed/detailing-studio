import type { WorkOrderStatus } from '@det/backend-work-order-domain';

import type {
  CursorPaginatedResult,
  NormDeviationReportItem,
  WorkOrderListItemReadModel,
} from '../read-models/work-order.read-models';

export interface ListWorkOrdersFilter {
  readonly branchId?: string;
  readonly masterId?: string;
  readonly clientId?: string;
  readonly status?: WorkOrderStatus;
  readonly dateRange?: {
    readonly from: string;
    readonly to: string;
  };
  readonly limit: number;
  readonly cursor?: string;
}

export interface NormDeviationReportFilter {
  readonly branchId?: string;
  readonly masterId?: string;
  readonly dateRange: {
    readonly from: string;
    readonly to: string;
  };
}

export interface IWorkOrderReadPort {
  list(filter: ListWorkOrdersFilter): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>>;
  listClosedByClient(
    clientId: string,
    limit: number,
    cursor?: string,
  ): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>>;
  getNormDeviationReport(
    filter: NormDeviationReportFilter,
  ): Promise<readonly NormDeviationReportItem[]>;
}
