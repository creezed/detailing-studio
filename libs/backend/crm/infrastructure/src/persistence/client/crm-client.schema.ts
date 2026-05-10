import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';

import { ClientStatus } from '@det/backend-crm-domain';

@Entity({ tableName: 'crm_client' })
export class CrmClientSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'last_name', type: 'text' })
  declare lastName: string;

  @Property({ fieldName: 'first_name', type: 'text' })
  declare firstName: string;

  @Property({ fieldName: 'middle_name', nullable: true, type: 'text' })
  declare middleName: string | null;

  @Property({ fieldName: 'phone_e164', type: 'text' })
  declare phoneE164: string;

  @Property({ nullable: true, type: 'text' })
  declare email: string | null;

  @Property({ fieldName: 'birth_date', nullable: true, type: 'date' })
  declare birthDate: Date | null;

  @Property({ nullable: true, type: 'text' })
  declare source: string | null;

  @Property({ type: 'text' })
  declare type: string;

  @Enum({ items: () => ClientStatus, nativeEnumName: 'crm_client_status', type: 'text' })
  declare status: ClientStatus;

  @Property({ type: 'text', default: '' })
  declare comment: string;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'anonymized_at', nullable: true, type: 'timestamptz' })
  declare anonymizedAt: Date | null;

  @Property({ version: true })
  declare version: number;
}
