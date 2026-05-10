import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { InvStockSchema } from './inv-stock.schema';

@Entity({ tableName: 'inv_batch' })
export class InvBatchSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => InvStockSchema, { fieldName: 'stock_id', type: 'uuid' })
  declare stock: InvStockSchema;

  @Property({ fieldName: 'supplier_id', nullable: true, type: 'uuid' })
  declare supplierId: string | null;

  @Property({ fieldName: 'source_type', type: 'text' })
  declare sourceType: string;

  @Property({ fieldName: 'source_doc_id', type: 'uuid' })
  declare sourceDocId: string;

  @Property({ columnType: 'numeric(18,4)', fieldName: 'initial_quantity', type: 'string' })
  declare initialQuantity: string;

  @Property({ columnType: 'numeric(18,4)', fieldName: 'remaining_quantity', type: 'string' })
  declare remainingQuantity: string;

  @Property({ columnType: 'bigint', fieldName: 'unit_cost_cents', type: 'string' })
  declare unitCostCents: string;

  @Property({ fieldName: 'expires_at', nullable: true, type: 'date' })
  declare expiresAt: Date | null;

  @Property({ fieldName: 'received_at', type: 'timestamptz' })
  declare receivedAt: Date;
}
