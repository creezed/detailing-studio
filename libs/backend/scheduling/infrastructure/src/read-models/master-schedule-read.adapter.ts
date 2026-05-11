import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  IMasterScheduleReadPort,
  MasterScheduleReadModel,
} from '@det/backend-scheduling-application';

import { masterScheduleToReadModel } from './scheduling-read-model.mapper';
import { MasterScheduleSchema } from '../persistence/master-schedule.schema';

@Injectable()
export class MasterScheduleReadAdapter implements IMasterScheduleReadPort {
  constructor(private readonly em: EntityManager) {}

  async getByMasterAndBranch(
    masterId: string,
    branchId: string,
  ): Promise<MasterScheduleReadModel | null> {
    const schedule = await this.em.findOne(
      MasterScheduleSchema,
      { branchId, masterId },
      { populate: ['unavailabilities'] },
    );
    return schedule === null ? null : masterScheduleToReadModel(schedule);
  }

  async listByBranch(branchId: string): Promise<readonly MasterScheduleReadModel[]> {
    const schedules = await this.em.find(
      MasterScheduleSchema,
      { branchId },
      { orderBy: { masterId: 'ASC' }, populate: ['unavailabilities'] },
    );
    return schedules.map(masterScheduleToReadModel);
  }
}
