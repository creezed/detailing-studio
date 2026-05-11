import { Inject } from '@nestjs/common';
import { QueryBus, QueryHandler } from '@nestjs/cqrs';

import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { GetWorkOrderByAppointmentQuery } from './get-work-order-by-appointment.query';
import { WORK_ORDER_REPOSITORY } from '../../di/tokens';
import { GetWorkOrderByIdQuery } from '../get-work-order-by-id/get-work-order-by-id.query';

import type { WorkOrderDetailReadModel } from '../../read-models/work-order.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetWorkOrderByAppointmentQuery)
export class GetWorkOrderByAppointmentHandler implements IQueryHandler<
  GetWorkOrderByAppointmentQuery,
  WorkOrderDetailReadModel | null
> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetWorkOrderByAppointmentQuery): Promise<WorkOrderDetailReadModel | null> {
    const wo = await this.repo.findByAppointmentId(query.appointmentId);
    if (!wo) {
      return null;
    }

    return this.queryBus.execute<GetWorkOrderByIdQuery, WorkOrderDetailReadModel>(
      new GetWorkOrderByIdQuery(wo.id),
    );
  }
}
