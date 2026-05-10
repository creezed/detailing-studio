import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { InvReceiptSchema } from './inv-receipt.schema';

@Entity({ tableName: 'inv_receipt_line' })
export class InvReceiptLineSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => InvReceiptSchema, { fieldName: 'receipt_id', type: 'uuid' })
  declare receipt: InvReceiptSchema;

  @Property({ fieldName: 'sku_id', type: 'uuid' })
  declare skuId: string;

  @Property({ fieldName: 'packaging_id', nullable: true, type: 'uuid' })
  declare packagingId: string | null;

  @Property({ columnType: 'numeric(18,4)', fieldName: 'package_quantity', type: 'string' })
  declare packageQuantity: string;

  @Property({ columnType: 'numeric(18,4)', fieldName: 'base_quantity', type: 'string' })
  declare baseQuantity: string;

  @Property({ columnType: 'bigint', fieldName: 'unit_cost_cents', type: 'string' })
  declare unitCostCents: string;

  @Property({ fieldName: 'expires_at', nullable: true, type: 'date' })
  declare expiresAt: Date | null;
}
