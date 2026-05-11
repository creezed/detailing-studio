import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { MasterScheduleSchema } from './master-schedule.schema';

@Entity({ tableName: 'sch_master_unavailability' })
export class MasterUnavailabilitySchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => MasterScheduleSchema, {
    fieldName: 'master_schedule_id',
    referenceColumnName: 'id',
  })
  declare schedule: MasterScheduleSchema;

  @Property({ fieldName: 'from_at', type: 'timestamptz' })
  declare fromAt: Date;

  @Property({ fieldName: 'to_at', type: 'timestamptz' })
  declare toAt: Date;

  @Property({ type: 'text' })
  declare reason: string;
}
