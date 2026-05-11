import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ListAppointmentsQuery } from './list-appointments.query';
import { APPOINTMENT_READ_PORT } from '../../di/tokens';

import type { IAppointmentReadPort } from '../../ports/appointment-read.port';
import type {
  AppointmentReadModel,
  CursorPaginatedResult,
} from '../../read-models/scheduling.read-models';

@QueryHandler(ListAppointmentsQuery)
export class ListAppointmentsHandler implements IQueryHandler<
  ListAppointmentsQuery,
  CursorPaginatedResult<AppointmentReadModel>
> {
  constructor(
    @Inject(APPOINTMENT_READ_PORT) private readonly appointmentReadPort: IAppointmentReadPort,
  ) {}

  execute(query: ListAppointmentsQuery): Promise<CursorPaginatedResult<AppointmentReadModel>> {
    return this.appointmentReadPort.list({
      branchId: query.filter.branchId,
      clientId: query.filter.clientId,
      cursor: query.cursor,
      from: query.filter.dateRange?.from,
      limit: query.limit,
      masterId: query.filter.masterId,
      status: query.filter.status,
      to: query.filter.dateRange?.to,
    });
  }
}
