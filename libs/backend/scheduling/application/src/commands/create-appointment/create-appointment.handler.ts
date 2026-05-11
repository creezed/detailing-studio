import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Appointment, AppointmentId, CreationChannel } from '@det/backend-scheduling-domain';
import type { IAppointmentRepository } from '@det/backend-scheduling-domain';
import { err, ok } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateAppointmentCommand } from './create-appointment.command';
import { APPOINTMENT_REPOSITORY, CLOCK, ID_GENERATOR } from '../../di/tokens';
import { SlotConflictError } from '../../errors/application.errors';
import {
  applicationErrorResult,
  domainErrorResult,
  isDomainError,
  type AppointmentCommandResult,
} from '../../services/appointment-command-result';
import { AppointmentHotPathService } from '../../services/appointment-hot-path.service';

const MAX_OPTIMISTIC_LOCK_ATTEMPTS = 3;
const OPTIMISTIC_LOCK_BACKOFF_MS = [50, 100, 200] as const;

interface OptimisticLockFailure {
  readonly kind: 'OPTIMISTIC_LOCK_FAILURE';
}

@CommandHandler(CreateAppointmentCommand)
export class CreateAppointmentHandler implements ICommandHandler<
  CreateAppointmentCommand,
  AppointmentCommandResult<{ id: AppointmentId }>
> {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointmentRepo: IAppointmentRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    private readonly hotPath: AppointmentHotPathService,
  ) {}

  async execute(
    cmd: CreateAppointmentCommand,
  ): Promise<AppointmentCommandResult<{ id: AppointmentId }>> {
    for (let attempt = 0; attempt < MAX_OPTIMISTIC_LOCK_ATTEMPTS; attempt += 1) {
      const result = await this.tryCreate(cmd);
      if (!isOptimisticLockFailure(result)) {
        return result;
      }
      await delay(OPTIMISTIC_LOCK_BACKOFF_MS[attempt] ?? 200);
    }

    return err(new SlotConflictError());
  }

  private async tryCreate(
    cmd: CreateAppointmentCommand,
  ): Promise<AppointmentCommandResult<{ id: AppointmentId }> | OptimisticLockFailure> {
    const services = await this.hotPath.buildAppointmentServices({
      clientId: cmd.clientId,
      serviceIds: cmd.serviceIds,
      vehicleId: cmd.vehicleId,
    });
    if (!services.ok) {
      return services;
    }

    const availabilityError = await this.hotPath.assertSlotAvailable({
      bayId: cmd.bayId,
      branchId: cmd.branchId,
      masterId: cmd.masterId,
      servicesDurationMinutes: totalDurationMinutes(services.value),
      slot: cmd.slot,
    });
    if (availabilityError !== null) {
      return applicationErrorResult(availabilityError);
    }

    try {
      const appointment = Appointment.create({
        bayId: cmd.bayId,
        branchId: cmd.branchId,
        clientId: cmd.clientId,
        createdBy: cmd.createdBy,
        createdVia: CreationChannel[cmd.createdVia],
        idGen: this.idGen,
        masterId: cmd.masterId,
        now: this.clock.now(),
        services: services.value,
        slot: cmd.slot,
        vehicleId: cmd.vehicleId,
      });

      await this.appointmentRepo.save(appointment);

      return ok({ id: appointment.id });
    } catch (error) {
      if (isOptimisticLockError(error)) {
        return { kind: 'OPTIMISTIC_LOCK_FAILURE' };
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

function isOptimisticLockFailure(
  result: AppointmentCommandResult<{ id: AppointmentId }> | OptimisticLockFailure,
): result is OptimisticLockFailure {
  return 'kind' in result;
}

function isOptimisticLockError(error: unknown): boolean {
  return error instanceof Error && error.name === 'OptimisticLockError';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
