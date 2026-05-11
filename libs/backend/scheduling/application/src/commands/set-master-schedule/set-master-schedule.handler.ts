import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { MasterSchedule, ScheduleId } from '@det/backend-scheduling-domain';
import type {
  IBranchRepository,
  IBranchScheduleRepository,
  IMasterScheduleRepository,
} from '@det/backend-scheduling-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { SetMasterScheduleCommand } from './set-master-schedule.command';
import {
  BRANCH_REPOSITORY,
  BRANCH_SCHEDULE_REPOSITORY,
  CLOCK,
  ID_GENERATOR,
  MASTER_SCHEDULE_REPOSITORY,
} from '../../di/tokens';
import {
  BranchNotFoundError,
  BranchScheduleNotFoundError,
  MasterScheduleOutsideBranchHoursError,
} from '../../errors/application.errors';
import { isMasterPatternWithinBranchPattern } from '../../services/master-schedule-invariant.service';

@CommandHandler(SetMasterScheduleCommand)
export class SetMasterScheduleHandler implements ICommandHandler<
  SetMasterScheduleCommand,
  { id: ScheduleId }
> {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(BRANCH_SCHEDULE_REPOSITORY)
    private readonly branchScheduleRepo: IBranchScheduleRepository,
    @Inject(MASTER_SCHEDULE_REPOSITORY)
    private readonly masterScheduleRepo: IMasterScheduleRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: SetMasterScheduleCommand): Promise<{ id: ScheduleId }> {
    const branch = await this.branchRepo.findById(cmd.branchId);
    if (branch === null) {
      throw new BranchNotFoundError(cmd.branchId);
    }

    const branchSchedule = await this.branchScheduleRepo.findByBranchId(cmd.branchId);
    if (branchSchedule === null) {
      throw new BranchScheduleNotFoundError(cmd.branchId);
    }

    const branchPattern = branchSchedule.toSnapshot().weeklyPattern;
    if (!isMasterPatternWithinBranchPattern(cmd.weeklyPattern, branchPattern)) {
      throw new MasterScheduleOutsideBranchHoursError(cmd.masterId, cmd.branchId);
    }

    const existing = await this.masterScheduleRepo.findByMasterAndBranch(
      cmd.masterId,
      cmd.branchId,
    );
    const now = this.clock.now();
    const schedule =
      existing ??
      MasterSchedule.create({
        branchId: cmd.branchId,
        idGen: this.idGen,
        masterId: cmd.masterId,
        now,
        weeklyPattern: cmd.weeklyPattern,
      });

    if (existing !== null) {
      schedule.replaceWeeklyPattern(cmd.weeklyPattern, now);
    }

    await this.masterScheduleRepo.save(schedule);

    return { id: schedule.id };
  }
}
