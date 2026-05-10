import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'inv_supplier' })
export class InvSupplierSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ type: 'text' })
  declare name: string;

  @Property({ nullable: true, type: 'text' })
  declare inn: string | null;

  @Property({ fieldName: 'contact_name', nullable: true, type: 'text' })
  declare contactName: string | null;

  @Property({ fieldName: 'contact_phone', nullable: true, type: 'text' })
  declare contactPhone: string | null;

  @Property({ fieldName: 'contact_email', nullable: true, type: 'text' })
  declare contactEmail: string | null;

  @Property({ nullable: true, type: 'text' })
  declare address: string | null;

  @Property({ fieldName: 'is_active', type: 'boolean' })
  declare isActive: boolean;
}
