import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { BranchSchedule, ScheduleId } from '@det/backend-scheduling-domain';
import type { IBranchRepository, IBranchScheduleRepository } from '@det/backend-scheduling-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { SetBranchScheduleCommand } from './set-branch-schedule.command';
import {
  BRANCH_REPOSITORY,
  BRANCH_SCHEDULE_REPOSITORY,
  CLOCK,
  ID_GENERATOR,
} from '../../di/tokens';
import { BranchNotFoundError } from '../../errors/application.errors';

@CommandHandler(SetBranchScheduleCommand)
export class SetBranchScheduleHandler implements ICommandHandler<
  SetBranchScheduleCommand,
  { id: ScheduleId }
> {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(BRANCH_SCHEDULE_REPOSITORY)
    private readonly branchScheduleRepo: IBranchScheduleRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: SetBranchScheduleCommand): Promise<{ id: ScheduleId }> {
    const branch = await this.branchRepo.findById(cmd.branchId);
    if (branch === null) {
      throw new BranchNotFoundError(cmd.branchId);
    }

    const existing = await this.branchScheduleRepo.findByBranchId(cmd.branchId);
    const now = this.clock.now();
    const schedule =
      existing ??
      BranchSchedule.create({
        branchId: cmd.branchId,
        idGen: this.idGen,
        now,
        weeklyPattern: cmd.weeklyPattern,
      });

    if (existing !== null) {
      schedule.replaceWeeklyPattern(cmd.weeklyPattern, now);
    }

    await this.branchScheduleRepo.save(schedule);

    return { id: schedule.id };
  }
}
