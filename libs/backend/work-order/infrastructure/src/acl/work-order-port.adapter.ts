import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import {
  GetClientWorkOrdersQuery,
  GetWorkOrderByAppointmentQuery,
  GetWorkOrderByIdQuery,
  WorkOrderNotFoundError,
} from '@det/backend-work-order-application';
import type {
  CursorPaginatedResult,
  IWorkOrderPort,
  WorkOrderDetailReadModel,
  WorkOrderListItemReadModel,
} from '@det/backend-work-order-application';

@Injectable()
export class WorkOrderPortAdapter implements IWorkOrderPort {
  constructor(private readonly queryBus: QueryBus) {}

  async getById(workOrderId: string): Promise<WorkOrderDetailReadModel | null> {
    try {
      return await this.queryBus.execute<GetWorkOrderByIdQuery, WorkOrderDetailReadModel>(
        new GetWorkOrderByIdQuery(workOrderId),
      );
    } catch (error) {
      if (error instanceof WorkOrderNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  listByClient(
    clientId: string,
    limit: number,
    cursor?: string,
  ): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>> {
    return this.queryBus.execute<
      GetClientWorkOrdersQuery,
      CursorPaginatedResult<WorkOrderListItemReadModel>
    >(new GetClientWorkOrdersQuery(clientId, limit, cursor));
  }

  async getByAppointmentId(appointmentId: string): Promise<WorkOrderDetailReadModel | null> {
    return this.queryBus.execute<GetWorkOrderByAppointmentQuery, WorkOrderDetailReadModel | null>(
      new GetWorkOrderByAppointmentQuery(appointmentId),
    );
  }
}
