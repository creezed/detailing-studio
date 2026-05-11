import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { UnavailabilityId } from '@det/backend-scheduling-domain';
import type { IMasterScheduleRepository } from '@det/backend-scheduling-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { AddMasterUnavailabilityCommand } from './add-master-unavailability.command';
import { CLOCK, ID_GENERATOR, MASTER_SCHEDULE_REPOSITORY } from '../../di/tokens';
import { MasterScheduleNotFoundError } from '../../errors/application.errors';

@CommandHandler(AddMasterUnavailabilityCommand)
export class AddMasterUnavailabilityHandler implements ICommandHandler<
  AddMasterUnavailabilityCommand,
  { id: UnavailabilityId }
> {
  constructor(
    @Inject(MASTER_SCHEDULE_REPOSITORY)
    private readonly masterScheduleRepo: IMasterScheduleRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: AddMasterUnavailabilityCommand): Promise<{ id: UnavailabilityId }> {
    const schedule = await this.masterScheduleRepo.findByMasterAndBranch(
      cmd.masterId,
      cmd.branchId,
    );
    if (schedule === null) {
      throw new MasterScheduleNotFoundError(cmd.masterId, cmd.branchId);
    }

    const id = schedule.addUnavailability(
      cmd.fromAt,
      cmd.toAt,
      cmd.reason,
      this.idGen,
      this.clock.now(),
    );
    await this.masterScheduleRepo.save(schedule);

    return { id };
  }
}
