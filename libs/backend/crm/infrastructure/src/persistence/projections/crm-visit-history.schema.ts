import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'crm_visit_history' })
export class CrmVisitHistorySchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'client_id', type: 'uuid' })
  declare clientId: string;

  @Property({ fieldName: 'vehicle_id', nullable: true, type: 'uuid' })
  declare vehicleId: string | null;

  @Property({ fieldName: 'appointment_id', type: 'uuid' })
  declare appointmentId: string;

  @Property({ fieldName: 'work_order_id', nullable: true, type: 'uuid' })
  declare workOrderId: string | null;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ fieldName: 'master_id', type: 'uuid' })
  declare masterId: string;

  @Property({ fieldName: 'services_summary', type: 'jsonb' })
  declare servicesSummary: Array<{ serviceId: string; name: string; priceCents: number }>;

  @Property({ fieldName: 'scheduled_at', type: 'timestamptz' })
  declare scheduledAt: Date;

  @Property({ fieldName: 'started_at', nullable: true, type: 'timestamptz' })
  declare startedAt: Date | null;

  @Property({ fieldName: 'completed_at', nullable: true, type: 'timestamptz' })
  declare completedAt: Date | null;

  @Property({ fieldName: 'cancelled_at', nullable: true, type: 'timestamptz' })
  declare cancelledAt: Date | null;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ fieldName: 'total_amount_cents', nullable: true, type: 'bigint' })
  declare totalAmountCents: number | null;

  @Property({ fieldName: 'materials_total_cents', nullable: true, type: 'bigint' })
  declare materialsTotalCents: number | null;

  @Property({ fieldName: 'photo_count', type: 'int', default: 0 })
  declare photoCount: number;

  @Property({ fieldName: 'before_photo_urls', nullable: true, type: 'jsonb' })
  declare beforePhotoUrls: string[] | null;

  @Property({ fieldName: 'after_photo_urls', nullable: true, type: 'jsonb' })
  declare afterPhotoUrls: string[] | null;

  @Property({ fieldName: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
