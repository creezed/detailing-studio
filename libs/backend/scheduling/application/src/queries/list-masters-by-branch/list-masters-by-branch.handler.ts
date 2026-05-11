import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ListMastersByBranchQuery } from './list-masters-by-branch.query';
import { IAM_USER_PORT, MASTER_SCHEDULE_READ_PORT } from '../../di/tokens';
import { IamUserNotFoundError } from '../../errors/application.errors';

import type { IIamUserPort } from '../../ports/iam-user.port';
import type { IMasterScheduleReadPort } from '../../ports/master-schedule-read.port';
import type { MasterReadModel } from '../../read-models/scheduling.read-models';

@QueryHandler(ListMastersByBranchQuery)
export class ListMastersByBranchHandler implements IQueryHandler<
  ListMastersByBranchQuery,
  readonly MasterReadModel[]
> {
  constructor(
    @Inject(MASTER_SCHEDULE_READ_PORT)
    private readonly masterScheduleReadPort: IMasterScheduleReadPort,
    @Inject(IAM_USER_PORT) private readonly iamUserPort: IIamUserPort,
  ) {}

  async execute(query: ListMastersByBranchQuery): Promise<readonly MasterReadModel[]> {
    const schedules = await this.masterScheduleReadPort.listByBranch(query.branchId);

    return Promise.all(
      schedules.map(async (schedule) => {
        const user = await this.iamUserPort.getById(schedule.masterId);
        if (user === null) {
          throw new IamUserNotFoundError(schedule.masterId);
        }

        return {
          fullName: user.fullName,
          masterId: schedule.masterId,
          schedule,
        };
      }),
    );
  }
}
