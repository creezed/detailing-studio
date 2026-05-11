import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { WoWorkOrderSchema } from './wo-work-order.schema';

@Entity({ tableName: 'wo_consumption_line' })
export class WoConsumptionLineSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => WoWorkOrderSchema, { fieldName: 'work_order_id' })
  declare workOrder: WoWorkOrderSchema;

  @Property({ fieldName: 'sku_id', type: 'uuid' })
  declare skuId: string;

  @Property({ fieldName: 'actual_amount', type: 'numeric' })
  declare actualAmount: number;

  @Property({ fieldName: 'actual_unit', type: 'text' })
  declare actualUnit: string;

  @Property({ fieldName: 'norm_amount', type: 'numeric' })
  declare normAmount: number;

  @Property({ fieldName: 'norm_unit', type: 'text' })
  declare normUnit: string;

  @Property({ fieldName: 'deviation_reason', nullable: true, type: 'text' })
  declare deviationReason: string | null;

  @Property({ nullable: true, type: 'text' })
  declare comment: string | null;
}
