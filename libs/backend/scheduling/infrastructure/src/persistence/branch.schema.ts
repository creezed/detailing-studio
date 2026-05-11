import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'sch_branch' })
export class BranchSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ type: 'text' })
  declare name: string;

  @Property({ type: 'text' })
  declare address: string;

  @Property({ type: 'text' })
  declare timezone: string;

  @Property({ fieldName: 'is_active', type: 'boolean' })
  declare isActive: boolean;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;
}
