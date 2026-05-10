import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { InvStockTakingLineSchema } from './inv-stock-taking-line.schema';

@Entity({ tableName: 'inv_stock_taking' })
export class InvStockTakingSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ fieldName: 'started_at', type: 'timestamptz' })
  declare startedAt: Date;

  @Property({ fieldName: 'completed_at', nullable: true, type: 'timestamptz' })
  declare completedAt: Date | null;

  @Property({ fieldName: 'created_by', type: 'uuid' })
  declare createdBy: string;

  @OneToMany(() => InvStockTakingLineSchema, (l) => l.stockTaking, { orphanRemoval: true })
  lines = new Collection<InvStockTakingLineSchema>(this);
}
