import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'inv_stock_movement' })
export class InvStockMovementSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'stock_id', type: 'uuid' })
  declare stockId: string;

  @Property({ fieldName: 'batch_id', nullable: true, type: 'uuid' })
  declare batchId: string | null;

  @Property({ fieldName: 'movement_type', type: 'text' })
  declare movementType: string;

  @Property({ columnType: 'numeric(18,4)', type: 'string' })
  declare delta: string;

  @Property({ columnType: 'bigint', fieldName: 'cost_cents', type: 'string' })
  declare costCents: string;

  @Property({ nullable: true, type: 'text' })
  declare reason: string | null;

  @Property({ fieldName: 'source_type', type: 'text' })
  declare sourceType: string;

  @Property({ fieldName: 'source_doc_id', type: 'uuid' })
  declare sourceDocId: string;

  @Property({ fieldName: 'actor_user_id', nullable: true, type: 'uuid' })
  declare actorUserId: string | null;

  @Property({ fieldName: 'occurred_at', type: 'timestamptz' })
  declare occurredAt: Date;
}
