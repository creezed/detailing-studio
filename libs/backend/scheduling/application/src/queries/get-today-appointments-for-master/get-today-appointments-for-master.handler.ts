import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { CLOCK } from '@det/backend-shared-ddd';
import type { IClock } from '@det/backend-shared-ddd';

import { GetTodayAppointmentsForMasterQuery } from './get-today-appointments-for-master.query';
import { APPOINTMENT_READ_PORT } from '../../di/tokens';

import type { IAppointmentReadPort } from '../../ports/appointment-read.port';
import type { AppointmentReadModel } from '../../read-models/scheduling.read-models';

@QueryHandler(GetTodayAppointmentsForMasterQuery)
export class GetTodayAppointmentsForMasterHandler implements IQueryHandler<
  GetTodayAppointmentsForMasterQuery,
  readonly AppointmentReadModel[]
> {
  constructor(
    @Inject(APPOINTMENT_READ_PORT) private readonly appointmentReadPort: IAppointmentReadPort,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  execute(query: GetTodayAppointmentsForMasterQuery): Promise<readonly AppointmentReadModel[]> {
    const date = query.date ?? this.clock.now().iso().slice(0, 10);
    return this.appointmentReadPort.listByMasterAndDay(query.masterId, date);
  }
}
