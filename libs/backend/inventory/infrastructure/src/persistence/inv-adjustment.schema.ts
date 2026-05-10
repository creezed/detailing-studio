import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { InvAdjustmentLineSchema } from './inv-adjustment-line.schema';

@Entity({ tableName: 'inv_adjustment' })
export class InvAdjustmentSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ type: 'text' })
  declare reason: string;

  @Property({ columnType: 'bigint', fieldName: 'total_amount_cents', type: 'string' })
  declare totalAmountCents: string;

  @Property({ fieldName: 'created_by', type: 'uuid' })
  declare createdBy: string;

  @Property({ fieldName: 'approved_by', nullable: true, type: 'uuid' })
  declare approvedBy: string | null;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'approved_at', nullable: true, type: 'timestamptz' })
  declare approvedAt: Date | null;

  @OneToMany(() => InvAdjustmentLineSchema, (l) => l.adjustment, { orphanRemoval: true })
  lines = new Collection<InvAdjustmentLineSchema>(this);
}
