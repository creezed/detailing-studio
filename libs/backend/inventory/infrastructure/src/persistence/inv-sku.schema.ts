import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { InvPackagingSchema } from './inv-packaging.schema';

@Entity({ tableName: 'inv_sku' })
export class InvSkuSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'article_number', type: 'text' })
  declare articleNumber: string;

  @Property({ type: 'text' })
  declare name: string;

  @Property({ fieldName: 'group', type: 'text' })
  declare group: string;

  @Property({ fieldName: 'base_unit', type: 'text' })
  declare baseUnit: string;

  @Property({ nullable: true, type: 'text' })
  declare barcode: string | null;

  @Property({ fieldName: 'has_expiry', type: 'boolean' })
  declare hasExpiry: boolean;

  @Property({ fieldName: 'photo_url', nullable: true, type: 'text' })
  declare photoUrl: string | null;

  @Property({ fieldName: 'is_active', type: 'boolean' })
  declare isActive: boolean;

  @Property({ fieldName: 'description_md', type: 'text' })
  declare descriptionMd: string;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @OneToMany(() => InvPackagingSchema, (p) => p.sku, { orphanRemoval: true })
  packagings = new Collection<InvPackagingSchema>(this);
}
