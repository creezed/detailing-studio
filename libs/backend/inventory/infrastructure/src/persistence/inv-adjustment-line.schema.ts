import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { InvAdjustmentSchema } from './inv-adjustment.schema';

@Entity({ tableName: 'inv_adjustment_line' })
export class InvAdjustmentLineSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => InvAdjustmentSchema, { fieldName: 'adjustment_id', type: 'uuid' })
  declare adjustment: InvAdjustmentSchema;

  @Property({ fieldName: 'sku_id', type: 'uuid' })
  declare skuId: string;

  @Property({ columnType: 'numeric(18,4)', type: 'string' })
  declare delta: string;

  @Property({ columnType: 'bigint', fieldName: 'snapshot_unit_cost_cents', type: 'string' })
  declare snapshotUnitCostCents: string;
}
