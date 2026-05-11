import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  BranchDetailReadModel,
  BranchListItemReadModel,
  IBranchReadPort,
  ListBranchesFilter,
  PaginatedResult,
} from '@det/backend-scheduling-application';

import { BranchScheduleReadAdapter } from './branch-schedule-read.adapter';
import { branchToListItem } from './scheduling-read-model.mapper';
import { BranchSchema } from '../persistence/branch.schema';

@Injectable()
export class BranchReadAdapter implements IBranchReadPort {
  constructor(
    private readonly em: EntityManager,
    private readonly branchScheduleReadAdapter: BranchScheduleReadAdapter,
  ) {}

  async list(filter: ListBranchesFilter): Promise<PaginatedResult<BranchListItemReadModel>> {
    const where = filter.isActive === undefined ? {} : { isActive: filter.isActive };
    const [items, total] = await this.em.findAndCount(BranchSchema, where, {
      limit: filter.pageSize,
      offset: (filter.page - 1) * filter.pageSize,
      orderBy: { name: 'ASC' },
    });

    return {
      items: items.map(branchToListItem),
      total,
    };
  }

  async getById(id: string): Promise<BranchDetailReadModel | null> {
    const branch = await this.em.findOne(BranchSchema, { id });
    if (branch === null) {
      return null;
    }

    const schedule = await this.branchScheduleReadAdapter.getByBranchId(branch.id);

    return {
      ...branchToListItem(branch),
      schedule,
    };
  }
}
