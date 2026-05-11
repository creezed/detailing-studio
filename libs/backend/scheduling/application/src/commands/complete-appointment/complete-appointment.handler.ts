import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { AppointmentStatus } from '@det/backend-scheduling-domain';
import type { IAppointmentRepository } from '@det/backend-scheduling-domain';
import { ok } from '@det/backend-shared-ddd';

import { CompleteAppointmentCommand } from './complete-appointment.command';
import { APPOINTMENT_REPOSITORY } from '../../di/tokens';
import { AppointmentNotFoundError } from '../../errors/application.errors';
import {
  applicationErrorResult,
  domainErrorResult,
  isDomainError,
  type AppointmentCommandResult,
} from '../../services/appointment-command-result';

@CommandHandler(CompleteAppointmentCommand)
export class CompleteAppointmentHandler implements ICommandHandler<
  CompleteAppointmentCommand,
  AppointmentCommandResult<null>
> {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointmentRepo: IAppointmentRepository,
  ) {}

  async execute(cmd: CompleteAppointmentCommand): Promise<AppointmentCommandResult<null>> {
    const appointment = await this.appointmentRepo.findById(cmd.appointmentId);
    if (appointment === null) {
      return applicationErrorResult(new AppointmentNotFoundError(cmd.appointmentId));
    }

    if (appointment.toSnapshot().status === AppointmentStatus.COMPLETED) {
      return ok(null);
    }

    try {
      appointment.complete(cmd.completedAt);
      await this.appointmentRepo.save(appointment);
      return ok(null);
    } catch (error) {
      if (isDomainError(error)) {
        return domainErrorResult(error);
      }
      throw error;
    }
  }
}
