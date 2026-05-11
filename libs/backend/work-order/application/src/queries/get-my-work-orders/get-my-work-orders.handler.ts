import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { GetMyWorkOrdersQuery } from './get-my-work-orders.query';
import { IAM_USER_PORT, SCHEDULING_APPOINTMENT_PORT, WORK_ORDER_REPOSITORY } from '../../di/tokens';

import type { IIamUserPort } from '../../ports/iam-user.port';
import type { ISchedulingAppointmentPort } from '../../ports/scheduling-appointment.port';
import type { WorkOrderListItemReadModel } from '../../read-models/work-order.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

export interface MyWorkOrderReadModel extends WorkOrderListItemReadModel {
  readonly slotStart: string | null;
}

@QueryHandler(GetMyWorkOrdersQuery)
export class GetMyWorkOrdersHandler implements IQueryHandler<
  GetMyWorkOrdersQuery,
  readonly MyWorkOrderReadModel[]
> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(IAM_USER_PORT) private readonly iamUserPort: IIamUserPort,
    @Inject(SCHEDULING_APPOINTMENT_PORT)
    private readonly schedulingPort: ISchedulingAppointmentPort,
  ) {}

  async execute(query: GetMyWorkOrdersQuery): Promise<readonly MyWorkOrderReadModel[]> {
    const workOrders = await this.repo.listByMaster(query.masterId);
    const master = await this.iamUserPort.getById(query.masterId);
    const masterName = master?.fullName ?? 'Неизвестный мастер';

    const filtered =
      query.statuses.length > 0
        ? workOrders.filter((wo) => query.statuses.includes(wo.status))
        : workOrders;

    const results: MyWorkOrderReadModel[] = [];

    for (const wo of filtered) {
      const snapshot = wo.toSnapshot();
      const appointment = await this.schedulingPort.getById(snapshot.appointmentId);

      results.push({
        id: snapshot.id,
        appointmentId: snapshot.appointmentId,
        status: snapshot.status,
        openedAt: snapshot.openedAt,
        closedAt: snapshot.closedAt,
        masterFullName: masterName,
        clientFullName: snapshot.clientId,
        servicesCount: snapshot.services.length,
        linesCount: snapshot.lines.length,
        photosCount: snapshot.photosBefore.length + snapshot.photosAfter.length,
        slotStart: appointment?.slotStart ?? null,
      });
    }

    results.sort((a, b) => {
      if (a.slotStart && b.slotStart) {
        return a.slotStart.localeCompare(b.slotStart);
      }
      return a.openedAt.localeCompare(b.openedAt);
    });

    return results;
  }
}
