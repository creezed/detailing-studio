import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { InvTransferSchema } from './inv-transfer.schema';

@Entity({ tableName: 'inv_transfer_line' })
export class InvTransferLineSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => InvTransferSchema, { fieldName: 'transfer_id', type: 'uuid' })
  declare transfer: InvTransferSchema;

  @Property({ fieldName: 'sku_id', type: 'uuid' })
  declare skuId: string;

  @Property({ columnType: 'numeric(18,4)', type: 'string' })
  declare quantity: string;

  @Property({ fieldName: 'base_unit', type: 'text' })
  declare baseUnit: string;
}
