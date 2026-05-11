import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { Bay, BayId, BranchId, IBayRepository } from '@det/backend-scheduling-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import { mapBayToDomain, mapBayToPersistence } from '../mappers/bay.mapper';
import { BaySchema } from '../persistence/bay.schema';

@Injectable()
export class BayRepository implements IBayRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: BayId): Promise<Bay | null> {
    const schema = await this.em.findOne(BaySchema, { id });
    return schema === null ? null : mapBayToDomain(schema);
  }

  async findByBranch(branchId: BranchId): Promise<readonly Bay[]> {
    const schemas = await this.em.find(BaySchema, { branchId }, { orderBy: { name: 'ASC' } });
    return schemas.map(mapBayToDomain);
  }

  async save(bay: Bay): Promise<void> {
    const existing = await this.em.findOne(BaySchema, { id: bay.id });
    const persisted = mapBayToPersistence(bay, existing);
    const events = bay.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
