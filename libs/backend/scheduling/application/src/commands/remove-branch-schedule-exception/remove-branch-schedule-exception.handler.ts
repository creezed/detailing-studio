import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IBranchScheduleRepository } from '@det/backend-scheduling-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { RemoveBranchScheduleExceptionCommand } from './remove-branch-schedule-exception.command';
import { BRANCH_SCHEDULE_REPOSITORY, CLOCK } from '../../di/tokens';
import { BranchScheduleNotFoundError } from '../../errors/application.errors';

@CommandHandler(RemoveBranchScheduleExceptionCommand)
export class RemoveBranchScheduleExceptionHandler implements ICommandHandler<
  RemoveBranchScheduleExceptionCommand,
  void
> {
  constructor(
    @Inject(BRANCH_SCHEDULE_REPOSITORY)
    private readonly branchScheduleRepo: IBranchScheduleRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: RemoveBranchScheduleExceptionCommand): Promise<void> {
    const schedule = await this.branchScheduleRepo.findByBranchId(cmd.branchId);
    if (schedule === null) {
      throw new BranchScheduleNotFoundError(cmd.branchId);
    }

    schedule.removeException(cmd.date, this.clock.now());
    await this.branchScheduleRepo.save(schedule);
  }
}
