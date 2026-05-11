import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { GetAppointmentByIdQuery } from './get-appointment-by-id.query';
import { APPOINTMENT_READ_PORT } from '../../di/tokens';
import { AppointmentNotFoundError } from '../../errors/application.errors';

import type { IAppointmentReadPort } from '../../ports/appointment-read.port';
import type { AppointmentReadModel } from '../../read-models/scheduling.read-models';

@QueryHandler(GetAppointmentByIdQuery)
export class GetAppointmentByIdHandler implements IQueryHandler<
  GetAppointmentByIdQuery,
  AppointmentReadModel
> {
  constructor(
    @Inject(APPOINTMENT_READ_PORT) private readonly appointmentReadPort: IAppointmentReadPort,
  ) {}

  async execute(query: GetAppointmentByIdQuery): Promise<AppointmentReadModel> {
    const appointment = await this.appointmentReadPort.getById(query.appointmentId);
    if (appointment === null) {
      throw new AppointmentNotFoundError(query.appointmentId);
    }

    return appointment;
  }
}
