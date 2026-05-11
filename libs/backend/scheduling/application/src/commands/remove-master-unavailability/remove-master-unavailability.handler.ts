import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IMasterScheduleRepository } from '@det/backend-scheduling-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { RemoveMasterUnavailabilityCommand } from './remove-master-unavailability.command';
import { CLOCK, MASTER_SCHEDULE_REPOSITORY } from '../../di/tokens';
import { MasterScheduleNotFoundError } from '../../errors/application.errors';

@CommandHandler(RemoveMasterUnavailabilityCommand)
export class RemoveMasterUnavailabilityHandler implements ICommandHandler<
  RemoveMasterUnavailabilityCommand,
  void
> {
  constructor(
    @Inject(MASTER_SCHEDULE_REPOSITORY)
    private readonly masterScheduleRepo: IMasterScheduleRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: RemoveMasterUnavailabilityCommand): Promise<void> {
    const schedule = await this.masterScheduleRepo.findByMasterAndBranch(
      cmd.masterId,
      cmd.branchId,
    );
    if (schedule === null) {
      throw new MasterScheduleNotFoundError(cmd.masterId, cmd.branchId);
    }

    schedule.removeUnavailability(cmd.unavailabilityId, this.clock.now());
    await this.masterScheduleRepo.save(schedule);
  }
}
