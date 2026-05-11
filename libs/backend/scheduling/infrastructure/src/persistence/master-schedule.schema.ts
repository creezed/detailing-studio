import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { MasterUnavailabilitySchema } from './master-unavailability.schema';

import type { WeeklyPatternRecord } from './scheduling-json.types';

@Entity({ tableName: 'sch_master_schedule' })
export class MasterScheduleSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'master_user_id', type: 'uuid' })
  declare masterId: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ fieldName: 'weekly_pattern', type: 'jsonb' })
  declare weeklyPattern: readonly WeeklyPatternRecord[];

  @OneToMany(() => MasterUnavailabilitySchema, (unavailability) => unavailability.schedule, {
    eager: true,
    orphanRemoval: true,
  })
  unavailabilities = new Collection<MasterUnavailabilitySchema>(this);
}
