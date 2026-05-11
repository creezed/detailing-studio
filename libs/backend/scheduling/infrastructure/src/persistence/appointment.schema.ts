import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import type { AppointmentStatus, CreationChannel } from '@det/backend-scheduling-domain';

import { AppointmentServiceSchema } from './appointment-service.schema';
import { Version } from './version.decorator';

import type { AppointmentCancellationRequestRecord } from './scheduling-json.types';

@Entity({ tableName: 'sch_appointment' })
export class AppointmentSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'client_id', type: 'uuid' })
  declare clientId: string;

  @Property({ fieldName: 'vehicle_id', type: 'uuid' })
  declare vehicleId: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ fieldName: 'bay_id', nullable: true, type: 'uuid' })
  declare bayId: string | null;

  @Property({ fieldName: 'master_user_id', type: 'uuid' })
  declare masterId: string;

  @Property({ fieldName: 'starts_at', type: 'timestamptz' })
  declare startsAt: Date;

  @Property({ fieldName: 'ends_at', type: 'timestamptz' })
  declare endsAt: Date;

  @Property({ type: 'text' })
  declare timezone: string;

  @Property({ type: 'text' })
  declare status: AppointmentStatus;

  @Property({ fieldName: 'creation_channel', type: 'text' })
  declare creationChannel: CreationChannel;

  @Property({ fieldName: 'created_by', type: 'uuid' })
  declare createdBy: string;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'cancellation_request', nullable: true, type: 'jsonb' })
  declare cancellationRequest: AppointmentCancellationRequestRecord | null;

  @Version()
  declare version: number;

  @OneToMany(() => AppointmentServiceSchema, (service) => service.appointment, {
    eager: true,
    orphanRemoval: true,
  })
  services = new Collection<AppointmentServiceSchema>(this);
}
