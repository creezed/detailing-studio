import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { Branch, BranchId, IBranchRepository } from '@det/backend-scheduling-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import { mapBranchToDomain, mapBranchToPersistence } from '../mappers/branch.mapper';
import { BranchSchema } from '../persistence/branch.schema';

@Injectable()
export class BranchRepository implements IBranchRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: BranchId): Promise<Branch | null> {
    const schema = await this.em.findOne(BranchSchema, { id });
    return schema === null ? null : mapBranchToDomain(schema);
  }

  async findActive(): Promise<readonly Branch[]> {
    const schemas = await this.em.find(
      BranchSchema,
      { isActive: true },
      { orderBy: { name: 'ASC' } },
    );
    return schemas.map(mapBranchToDomain);
  }

  async save(branch: Branch): Promise<void> {
    const existing = await this.em.findOne(BranchSchema, { id: branch.id });
    const persisted = mapBranchToPersistence(branch, existing);
    const events = branch.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
