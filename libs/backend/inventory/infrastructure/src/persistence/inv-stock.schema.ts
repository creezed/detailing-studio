import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { InvBatchSchema } from './inv-batch.schema';

@Entity({ tableName: 'inv_stock' })
export class InvStockSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'sku_id', type: 'uuid' })
  declare skuId: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ columnType: 'numeric(18,4)', fieldName: 'reorder_level', type: 'string' })
  declare reorderLevel: string;

  @Property({ columnType: 'bigint', fieldName: 'average_cost_cents', type: 'string' })
  declare averageCostCents: string;

  @Property({ fieldName: 'base_unit', type: 'text' })
  declare baseUnit: string;

  @Property({ fieldName: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;

  @Property({ version: true })
  declare version: number;

  @OneToMany(() => InvBatchSchema, (b) => b.stock, { orphanRemoval: true })
  batches = new Collection<InvBatchSchema>(this);
}
