import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { AppointmentStatus } from '@det/backend-scheduling-domain';
import type { IAppointmentRepository } from '@det/backend-scheduling-domain';
import { ok } from '@det/backend-shared-ddd';
import type { IClock } from '@det/backend-shared-ddd';

import { StartWorkCommand } from './start-work.command';
import { APPOINTMENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { AppointmentNotFoundError } from '../../errors/application.errors';
import {
  applicationErrorResult,
  domainErrorResult,
  isDomainError,
  type AppointmentCommandResult,
} from '../../services/appointment-command-result';

@CommandHandler(StartWorkCommand)
export class StartWorkHandler implements ICommandHandler<
  StartWorkCommand,
  AppointmentCommandResult<null>
> {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointmentRepo: IAppointmentRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: StartWorkCommand): Promise<AppointmentCommandResult<null>> {
    const appointment = await this.appointmentRepo.findById(cmd.appointmentId);
    if (appointment === null) {
      return applicationErrorResult(new AppointmentNotFoundError(cmd.appointmentId));
    }

    if (appointment.toSnapshot().status === AppointmentStatus.IN_PROGRESS) {
      return ok(null);
    }

    try {
      appointment.startWork(cmd.by, this.clock.now());
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
