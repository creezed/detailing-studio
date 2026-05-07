import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';

import { RefreshSessionStatus } from '@det/backend/iam/domain';

@Entity({ tableName: 'iam_refresh_session' })
export class IamRefreshSessionSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'user_id', type: 'uuid' })
  declare userId: string;

  @Property({ fieldName: 'token_hash', type: 'text' })
  declare tokenHash: string;

  @Property({ fieldName: 'rotated_token_hashes', type: 'jsonb' })
  declare rotatedTokenHashes: string[];

  @Property({ fieldName: 'rotation_counter', type: 'int' })
  declare rotationCounter: number;

  @Enum({
    items: () => RefreshSessionStatus,
    nativeEnumName: 'iam_refresh_session_status',
    type: 'text',
  })
  declare status: RefreshSessionStatus;

  @Property({ fieldName: 'issued_at', type: 'timestamptz' })
  declare issuedAt: Date;

  @Property({ fieldName: 'expires_at', type: 'timestamptz' })
  declare expiresAt: Date;

  @Property({ fieldName: 'last_rotated_at', nullable: true, type: 'timestamptz' })
  declare lastRotatedAt: Date | null;

  @Property({ fieldName: 'revoked_at', nullable: true, type: 'timestamptz' })
  declare revokedAt: Date | null;

  @Property({ fieldName: 'revoked_by', nullable: true, type: 'uuid' })
  declare revokedBy: string | null;

  @Property({ fieldName: 'compromised_at', nullable: true, type: 'timestamptz' })
  declare compromisedAt: Date | null;

  @Property({ fieldName: 'parent_session_id', nullable: true, type: 'uuid' })
  declare parentSessionId: string | null;
}
