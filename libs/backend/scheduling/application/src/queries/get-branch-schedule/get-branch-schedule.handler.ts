import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { GetBranchScheduleQuery } from './get-branch-schedule.query';
import { BRANCH_SCHEDULE_READ_PORT } from '../../di/tokens';
import { BranchScheduleNotFoundError } from '../../errors/application.errors';

import type { IBranchScheduleReadPort } from '../../ports/branch-schedule-read.port';
import type { BranchScheduleReadModel } from '../../read-models/scheduling.read-models';

@QueryHandler(GetBranchScheduleQuery)
export class GetBranchScheduleHandler implements IQueryHandler<
  GetBranchScheduleQuery,
  BranchScheduleReadModel
> {
  constructor(
    @Inject(BRANCH_SCHEDULE_READ_PORT)
    private readonly branchScheduleReadPort: IBranchScheduleReadPort,
  ) {}

  async execute(query: GetBranchScheduleQuery): Promise<BranchScheduleReadModel> {
    const schedule = await this.branchScheduleReadPort.getByBranchId(query.branchId);
    if (schedule === null) {
      throw new BranchScheduleNotFoundError(query.branchId);
    }

    return schedule;
  }
}
