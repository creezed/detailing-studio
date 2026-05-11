import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { GetMasterScheduleQuery } from './get-master-schedule.query';
import { MASTER_SCHEDULE_READ_PORT } from '../../di/tokens';
import { MasterScheduleNotFoundError } from '../../errors/application.errors';

import type { IMasterScheduleReadPort } from '../../ports/master-schedule-read.port';
import type { MasterScheduleReadModel } from '../../read-models/scheduling.read-models';

@QueryHandler(GetMasterScheduleQuery)
export class GetMasterScheduleHandler implements IQueryHandler<
  GetMasterScheduleQuery,
  MasterScheduleReadModel
> {
  constructor(
    @Inject(MASTER_SCHEDULE_READ_PORT)
    private readonly masterScheduleReadPort: IMasterScheduleReadPort,
  ) {}

  async execute(query: GetMasterScheduleQuery): Promise<MasterScheduleReadModel> {
    const schedule = await this.masterScheduleReadPort.getByMasterAndBranch(
      query.masterId,
      query.branchId,
    );
    if (schedule === null) {
      throw new MasterScheduleNotFoundError(query.masterId, query.branchId);
    }

    return schedule;
  }
}
