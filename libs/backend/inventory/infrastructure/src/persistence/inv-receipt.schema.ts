import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { InvReceiptLineSchema } from './inv-receipt-line.schema';

@Entity({ tableName: 'inv_receipt' })
export class InvReceiptSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'supplier_id', type: 'uuid' })
  declare supplierId: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ fieldName: 'supplier_invoice_number', nullable: true, type: 'text' })
  declare supplierInvoiceNumber: string | null;

  @Property({ fieldName: 'supplier_invoice_date', nullable: true, type: 'date' })
  declare supplierInvoiceDate: Date | null;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ fieldName: 'attachment_url', nullable: true, type: 'text' })
  declare attachmentUrl: string | null;

  @Property({ fieldName: 'created_by', type: 'uuid' })
  declare createdBy: string;

  @Property({ fieldName: 'posted_by', nullable: true, type: 'uuid' })
  declare postedBy: string | null;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'posted_at', nullable: true, type: 'timestamptz' })
  declare postedAt: Date | null;

  @OneToMany(() => InvReceiptLineSchema, (l) => l.receipt, { orphanRemoval: true })
  lines = new Collection<InvReceiptLineSchema>(this);
}
