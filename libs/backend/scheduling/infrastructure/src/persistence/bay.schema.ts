import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'sch_bay' })
export class BaySchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'branch_id', type: 'uuid' })
  declare branchId: string;

  @Property({ type: 'text' })
  declare name: string;

  @Property({ fieldName: 'is_active', type: 'boolean' })
  declare isActive: boolean;
}
