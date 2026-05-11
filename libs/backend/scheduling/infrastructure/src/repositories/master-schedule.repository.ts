import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  BranchId,
  IMasterScheduleRepository,
  MasterId,
  MasterSchedule,
  ScheduleId,
} from '@det/backend-scheduling-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import {
  mapMasterScheduleToDomain,
  mapMasterScheduleToPersistence,
} from '../mappers/master-schedule.mapper';
import { MasterScheduleSchema } from '../persistence/master-schedule.schema';

@Injectable()
export class MasterScheduleRepository implements IMasterScheduleRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: ScheduleId): Promise<MasterSchedule | null> {
    const schema = await this.em.findOne(
      MasterScheduleSchema,
      { id },
      { populate: ['unavailabilities'] },
    );
    return schema === null ? null : mapMasterScheduleToDomain(schema);
  }

  async findByMasterAndBranch(
    masterId: MasterId,
    branchId: BranchId,
  ): Promise<MasterSchedule | null> {
    const schema = await this.em.findOne(
      MasterScheduleSchema,
      { branchId, masterId },
      { populate: ['unavailabilities'] },
    );
    return schema === null ? null : mapMasterScheduleToDomain(schema);
  }

  async findAllByBranch(branchId: BranchId): Promise<readonly MasterSchedule[]> {
    const schemas = await this.em.find(
      MasterScheduleSchema,
      { branchId },
      { orderBy: { masterId: 'ASC' }, populate: ['unavailabilities'] },
    );
    return schemas.map(mapMasterScheduleToDomain);
  }

  async save(schedule: MasterSchedule): Promise<void> {
    const existing = await this.em.findOne(
      MasterScheduleSchema,
      { id: schedule.id },
      { populate: ['unavailabilities'] },
    );
    const persisted = mapMasterScheduleToPersistence(schedule, existing);
    const events = schedule.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
