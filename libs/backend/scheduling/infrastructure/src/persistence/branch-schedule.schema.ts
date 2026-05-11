import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { BranchScheduleExceptionSchema } from './branch-schedule-exception.schema';

import type { WeeklyPatternRecord } from './scheduling-json.types';

@Entity({ tableName: 'sch_branch_schedule' })
export class BranchScheduleSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ fieldName: 'weekly_pattern', type: 'jsonb' })
  declare weeklyPattern: readonly WeeklyPatternRecord[];

  @OneToMany(() => BranchScheduleExceptionSchema, (exception) => exception.schedule, {
    eager: true,
    orphanRemoval: true,
  })
  exceptions = new Collection<BranchScheduleExceptionSchema>(this);
}
