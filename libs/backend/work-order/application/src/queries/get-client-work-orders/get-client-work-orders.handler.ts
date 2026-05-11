import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import { GetClientWorkOrdersQuery } from './get-client-work-orders.query';
import { WORK_ORDER_READ_PORT } from '../../di/tokens';

import type { IWorkOrderReadPort } from '../../ports/work-order-read.port';
import type {
  CursorPaginatedResult,
  WorkOrderListItemReadModel,
} from '../../read-models/work-order.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetClientWorkOrdersQuery)
export class GetClientWorkOrdersHandler implements IQueryHandler<
  GetClientWorkOrdersQuery,
  CursorPaginatedResult<WorkOrderListItemReadModel>
> {
  constructor(@Inject(WORK_ORDER_READ_PORT) private readonly readPort: IWorkOrderReadPort) {}

  execute(
    query: GetClientWorkOrdersQuery,
  ): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>> {
    return this.readPort.listClosedByClient(query.clientId, query.limit, query.cursor);
  }
}
