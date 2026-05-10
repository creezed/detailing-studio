import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { InvTransferLineSchema } from './inv-transfer-line.schema';

@Entity({ tableName: 'inv_transfer' })
export class InvTransferSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'from_branch_id', type: 'uuid' })
  declare fromBranchId: string;

  @Property({ fieldName: 'to_branch_id', type: 'uuid' })
  declare toBranchId: string;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ fieldName: 'created_by', type: 'uuid' })
  declare createdBy: string;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'posted_by', nullable: true, type: 'uuid' })
  declare postedBy: string | null;

  @Property({ fieldName: 'posted_at', nullable: true, type: 'timestamptz' })
  declare postedAt: Date | null;

  @OneToMany(() => InvTransferLineSchema, (l) => l.transfer, { orphanRemoval: true })
  lines = new Collection<InvTransferLineSchema>(this);
}
