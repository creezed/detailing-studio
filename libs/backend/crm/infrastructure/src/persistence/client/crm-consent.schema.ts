import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { CrmClientSchema } from './crm-client.schema';

@Entity({ tableName: 'crm_consent' })
export class CrmConsentSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => CrmClientSchema, {
    fieldName: 'client_id',
    referenceColumnName: 'id',
    nullable: false,
  })
  declare client: CrmClientSchema;

  @Property({ type: 'text' })
  declare type: string;

  @Property({ fieldName: 'given_at', type: 'timestamptz' })
  declare givenAt: Date;

  @Property({ fieldName: 'revoked_at', nullable: true, type: 'timestamptz' })
  declare revokedAt: Date | null;

  @Property({ fieldName: 'policy_version', type: 'text' })
  declare policyVersion: string;
}
