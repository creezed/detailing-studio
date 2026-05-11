import { Entity, ManyToOne, PrimaryKeyProp, Property } from '@mikro-orm/core';

import { BranchScheduleSchema } from './branch-schedule.schema';

import type { TimeRangeRecord } from './scheduling-json.types';

@Entity({ tableName: 'sch_branch_schedule_exception' })
export class BranchScheduleExceptionSchema {
  @ManyToOne(() => BranchScheduleSchema, {
    fieldName: 'branch_schedule_id',
    primary: true,
    referenceColumnName: 'id',
  })
  declare schedule: BranchScheduleSchema;

  @Property({ primary: true, type: 'date' })
  declare date: string;

  [PrimaryKeyProp]?: ['schedule', 'date'];

  @Property({ fieldName: 'is_closed', type: 'boolean' })
  declare isClosed: boolean;

  @Property({ fieldName: 'custom_range', nullable: true, type: 'jsonb' })
  declare customRange: TimeRangeRecord | null;

  @Property({ nullable: true, type: 'text' })
  declare reason: string | null;
}
