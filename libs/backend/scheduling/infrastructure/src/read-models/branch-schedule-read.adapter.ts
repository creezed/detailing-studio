import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  BranchScheduleReadModel,
  IBranchScheduleReadPort,
} from '@det/backend-scheduling-application';

import { branchScheduleToReadModel } from './scheduling-read-model.mapper';
import { BranchScheduleSchema } from '../persistence/branch-schedule.schema';

@Injectable()
export class BranchScheduleReadAdapter implements IBranchScheduleReadPort {
  constructor(private readonly em: EntityManager) {}

  async getByBranchId(branchId: string): Promise<BranchScheduleReadModel | null> {
    const schedule = await this.em.findOne(
      BranchScheduleSchema,
      { branchId },
      { populate: ['exceptions'] },
    );
    return schedule === null ? null : branchScheduleToReadModel(schedule);
  }
}
