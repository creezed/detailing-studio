import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { AppointmentSchema } from './appointment.schema';

@Entity({ tableName: 'sch_appointment_service' })
export class AppointmentServiceSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => AppointmentSchema, {
    fieldName: 'appointment_id',
    referenceColumnName: 'id',
  })
  declare appointment: AppointmentSchema;

  @Property({ fieldName: 'service_id', type: 'uuid' })
  declare serviceId: string;

  @Property({ fieldName: 'service_name_snapshot', type: 'text' })
  declare serviceNameSnapshot: string;

  @Property({ fieldName: 'duration_snapshot', type: 'int' })
  declare durationMinutesSnapshot: number;

  @Property({ fieldName: 'price_cents_snapshot', type: 'bigint' })
  declare priceCentsSnapshot: string;
}
