import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { BayReadModel, IBayReadPort } from '@det/backend-scheduling-application';

import { BaySchema } from '../persistence/bay.schema';

@Injectable()
export class BayReadAdapter implements IBayReadPort {
  constructor(private readonly em: EntityManager) {}

  async listByBranch(branchId: string): Promise<readonly BayReadModel[]> {
    const bays = await this.em.find(BaySchema, { branchId }, { orderBy: { name: 'ASC' } });
    return bays.map((bay) => ({
      branchId: bay.branchId,
      id: bay.id,
      isActive: bay.isActive,
      name: bay.name,
    }));
  }
}
