import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  BranchId,
  BranchSchedule,
  IBranchScheduleRepository,
  ScheduleId,
} from '@det/backend-scheduling-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import {
  mapBranchScheduleToDomain,
  mapBranchScheduleToPersistence,
} from '../mappers/branch-schedule.mapper';
import { BranchScheduleSchema } from '../persistence/branch-schedule.schema';

@Injectable()
export class BranchScheduleRepository implements IBranchScheduleRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: ScheduleId): Promise<BranchSchedule | null> {
    const schema = await this.em.findOne(
      BranchScheduleSchema,
      { id },
      { populate: ['exceptions'] },
    );
    return schema === null ? null : mapBranchScheduleToDomain(schema);
  }

  async findByBranchId(branchId: BranchId): Promise<BranchSchedule | null> {
    const schema = await this.em.findOne(
      BranchScheduleSchema,
      { branchId },
      { populate: ['exceptions'] },
    );
    return schema === null ? null : mapBranchScheduleToDomain(schema);
  }

  async save(schedule: BranchSchedule): Promise<void> {
    const existing = await this.em.findOne(
      BranchScheduleSchema,
      { id: schedule.id },
      { populate: ['exceptions'] },
    );
    const persisted = mapBranchScheduleToPersistence(schedule, existing);
    const events = schedule.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
