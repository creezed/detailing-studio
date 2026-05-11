import { Collection, Entity, Enum, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { WorkOrderStatus } from '@det/backend-work-order-domain';

import { WoConsumptionLineSchema } from './wo-consumption-line.schema';
import { WoPhotoSchema } from './wo-photo.schema';

@Entity({ tableName: 'wo_work_order' })
export class WoWorkOrderSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'appointment_id', type: 'uuid', unique: true })
  declare appointmentId: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ fieldName: 'master_id', type: 'uuid' })
  declare masterId: string;

  @Property({ fieldName: 'client_id', type: 'uuid' })
  declare clientId: string;

  @Property({ fieldName: 'vehicle_id', type: 'uuid' })
  declare vehicleId: string;

  @Enum({
    items: () => WorkOrderStatus,
    nativeEnumName: 'wo_work_order_status',
    type: 'text',
  })
  declare status: WorkOrderStatus;

  @Property({ fieldName: 'services', type: 'jsonb' })
  declare services: readonly Record<string, unknown>[];

  @Property({ fieldName: 'norms', type: 'jsonb' })
  declare norms: readonly Record<string, unknown>[];

  @Property({ fieldName: 'opened_at', type: 'timestamptz' })
  declare openedAt: Date;

  @Property({ fieldName: 'closed_at', nullable: true, type: 'timestamptz' })
  declare closedAt: Date | null;

  @Property({ fieldName: 'cancellation_reason', nullable: true, type: 'text' })
  declare cancellationReason: string | null;

  @Property({ version: true })
  declare version: number;

  @OneToMany(() => WoConsumptionLineSchema, (l) => l.workOrder, { orphanRemoval: true })
  lines = new Collection<WoConsumptionLineSchema>(this);

  @OneToMany(() => WoPhotoSchema, (p) => p.workOrder, { orphanRemoval: true })
  photos = new Collection<WoPhotoSchema>(this);
}
