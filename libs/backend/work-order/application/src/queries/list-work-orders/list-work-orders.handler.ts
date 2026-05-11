import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import { ListWorkOrdersQuery } from './list-work-orders.query';
import { WORK_ORDER_READ_PORT } from '../../di/tokens';

import type { IWorkOrderReadPort } from '../../ports/work-order-read.port';
import type {
  CursorPaginatedResult,
  WorkOrderListItemReadModel,
} from '../../read-models/work-order.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(ListWorkOrdersQuery)
export class ListWorkOrdersHandler implements IQueryHandler<
  ListWorkOrdersQuery,
  CursorPaginatedResult<WorkOrderListItemReadModel>
> {
  constructor(@Inject(WORK_ORDER_READ_PORT) private readonly readPort: IWorkOrderReadPort) {}

  execute(query: ListWorkOrdersQuery): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>> {
    return this.readPort.list({
      branchId: query.filter.branchId,
      clientId: query.filter.clientId,
      cursor: query.cursor,
      dateRange: query.filter.dateRange,
      limit: query.limit,
      masterId: query.filter.masterId,
      status: query.filter.status,
    });
  }
}
