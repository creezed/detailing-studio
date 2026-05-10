import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { InvSkuSchema } from './inv-sku.schema';

@Entity({ tableName: 'inv_packaging' })
export class InvPackagingSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => InvSkuSchema, { fieldName: 'sku_id', type: 'uuid' })
  declare sku: InvSkuSchema;

  @Property({ type: 'text' })
  declare name: string;

  @Property({ columnType: 'numeric', type: 'number' })
  declare coefficient: number;
}
