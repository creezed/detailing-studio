import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { CrmClientSchema } from './crm-client.schema';

@Entity({ tableName: 'crm_vehicle' })
export class CrmVehicleSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => CrmClientSchema, {
    fieldName: 'client_id',
    referenceColumnName: 'id',
    nullable: false,
  })
  declare client: CrmClientSchema;

  @Property({ type: 'text' })
  declare make: string;

  @Property({ type: 'text' })
  declare model: string;

  @Property({ fieldName: 'body_type', type: 'text' })
  declare bodyType: string;

  @Property({ fieldName: 'license_plate', nullable: true, type: 'text' })
  declare licensePlate: string | null;

  @Property({ nullable: true, type: 'text' })
  declare vin: string | null;

  @Property({ nullable: true, type: 'int' })
  declare year: number | null;

  @Property({ nullable: true, type: 'text' })
  declare color: string | null;

  @Property({ type: 'text', default: '' })
  declare comment: string;

  @Property({ fieldName: 'is_active', type: 'boolean', default: true })
  declare isActive: boolean;
}
