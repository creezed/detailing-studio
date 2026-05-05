import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';

import { Role, UserStatus } from '@det/backend/iam/domain';

@Entity({ tableName: 'iam_user' })
export class IamUserSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ nullable: true, type: 'text', unique: true })
  declare email: string | null;

  @Property({ nullable: true, type: 'text', unique: true })
  declare phone: string | null;

  @Property({ fieldName: 'password_hash', nullable: true, type: 'text' })
  declare passwordHash: string | null;

  @Property({ fieldName: 'full_name', type: 'text' })
  declare fullName: string;

  @Enum({ items: () => UserStatus, nativeEnumName: 'iam_user_status', type: 'text' })
  declare status: UserStatus;

  @Property({ fieldName: 'role_set', type: 'jsonb' })
  declare roleSet: Role[];

  @Property({ fieldName: 'branch_ids', type: 'jsonb' })
  declare branchIds: string[];

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'updated_at', nullable: true, type: 'timestamptz' })
  declare updatedAt: Date | null;

  @Property({ version: true })
  declare version: number;
}
