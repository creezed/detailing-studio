import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { InvStockTakingSchema } from './inv-stock-taking.schema';

@Entity({ tableName: 'inv_stock_taking_line' })
export class InvStockTakingLineSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => InvStockTakingSchema, { fieldName: 'stock_taking_id', type: 'uuid' })
  declare stockTaking: InvStockTakingSchema;

  @Property({ fieldName: 'sku_id', type: 'uuid' })
  declare skuId: string;

  @Property({ columnType: 'numeric(18,4)', fieldName: 'expected_quantity', type: 'string' })
  declare expectedQuantity: string;

  @Property({
    columnType: 'numeric(18,4)',
    fieldName: 'actual_quantity',
    nullable: true,
    type: 'string',
  })
  declare actualQuantity: string | null;

  @Property({ fieldName: 'base_unit', type: 'text' })
  declare baseUnit: string;
}
