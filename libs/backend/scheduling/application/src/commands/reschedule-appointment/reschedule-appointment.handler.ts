import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { AppointmentStatus } from '@det/backend-scheduling-domain';
import type { IAppointmentRepository } from '@det/backend-scheduling-domain';
import { ok } from '@det/backend-shared-ddd';
import type { IClock } from '@det/backend-shared-ddd';

import { RescheduleAppointmentCommand } from './reschedule-appointment.command';
import { APPOINTMENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { AppointmentNotFoundError, SlotConflictError } from '../../errors/application.errors';
import {
  applicationErrorResult,
  domainErrorResult,
  isDomainError,
  type AppointmentCommandResult,
} from '../../services/appointment-command-result';
import { AppointmentHotPathService } from '../../services/appointment-hot-path.service';

const CLIENT_RESCHEDULE_WINDOW_HOURS = 24;

@CommandHandler(RescheduleAppointmentCommand)
export class RescheduleAppointmentHandler implements ICommandHandler<
  RescheduleAppointmentCommand,
  AppointmentCommandResult<null>
> {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointmentRepo: IAppointmentRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    private readonly hotPath: AppointmentHotPathService,
  ) {}

  async execute(cmd: RescheduleAppointmentCommand): Promise<AppointmentCommandResult<null>> {
    const appointment = await this.appointmentRepo.findById(cmd.appointmentId);
    if (appointment === null) {
      return applicationErrorResult(new AppointmentNotFoundError(cmd.appointmentId));
    }

    const snapshot = appointment.toSnapshot();
    if (
      snapshot.status === AppointmentStatus.CONFIRMED &&
      cmd.actorRole === 'CLIENT' &&
      isInsideClientRescheduleWindow(cmd.slot, this.clock.now().toDate())
    ) {
      return applicationErrorResult(new SlotConflictError());
    }

    const availabilityError = await this.hotPath.assertSlotAvailable({
      bayId: cmd.bayId,
      branchId: cmd.branchId,
      excludeAppointmentId: cmd.appointmentId,
      masterId: cmd.masterId,
      servicesDurationMinutes: totalDurationMinutes(snapshot.services),
      slot: cmd.slot,
    });
    if (availabilityError !== null) {
      return applicationErrorResult(availabilityError);
    }

    try {
      appointment.reschedule(cmd.slot, cmd.actorId, this.clock.now(), cmd.masterId, cmd.bayId);
      await this.appointmentRepo.save(appointment);
      return ok(null);
    } catch (error) {
      if (isOptimisticLockError(error)) {
        return applicationErrorResult(new SlotConflictError());
      }
      if (isDomainError(error)) {
        return domainErrorResult(error);
      }
      throw error;
    }
  }
}

function totalDurationMinutes(
  services: readonly { readonly durationMinutesSnapshot: number }[],
): number {
  return services.reduce((sum, service) => sum + service.durationMinutesSnapshot, 0);
}

function isInsideClientRescheduleWindow(
  slot: { readonly start: { toDate(): Date } },
  now: Date,
): boolean {
  const windowMs = CLIENT_RESCHEDULE_WINDOW_HOURS * 60 * 60 * 1000;
  return slot.start.toDate().getTime() - now.getTime() < windowMs;
}

function isOptimisticLockError(error: unknown): boolean {
  return error instanceof Error && error.name === 'OptimisticLockError';
}
