import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'crm_anonymization_request' })
export class CrmAnonymizationRequestSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'client_id', type: 'uuid' })
  declare clientId: string;

  @Property({ fieldName: 'requested_by', type: 'uuid' })
  declare requestedBy: string;

  @Property({ type: 'text' })
  declare reason: string;

  @Property({ fieldName: 'requested_at', type: 'timestamptz' })
  declare requestedAt: Date;

  @Property({ fieldName: 'due_by', type: 'timestamptz' })
  declare dueBy: Date;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ fieldName: 'completed_by', nullable: true, type: 'uuid' })
  declare completedBy: string | null;

  @Property({ fieldName: 'completed_at', nullable: true, type: 'timestamptz' })
  declare completedAt: Date | null;

  @Property({ fieldName: 'cancelled_by', nullable: true, type: 'uuid' })
  declare cancelledBy: string | null;

  @Property({ fieldName: 'cancelled_at', nullable: true, type: 'timestamptz' })
  declare cancelledAt: Date | null;

  @Property({ fieldName: 'cancel_reason', nullable: true, type: 'text' })
  declare cancelReason: string | null;
}
