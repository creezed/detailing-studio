import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';

import { InvitationStatus, Role } from '@det/backend-iam-domain';

@Entity({ tableName: 'iam_invitation' })
export class IamInvitationSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ type: 'text' })
  declare email: string;

  @Enum({ items: () => Role, nativeEnumName: 'iam_invitation_role', type: 'text' })
  declare role: Role;

  @Property({ fieldName: 'branch_ids', type: 'jsonb' })
  declare branchIds: string[];

  @Property({ fieldName: 'token_hash', type: 'text', unique: true })
  declare tokenHash: string;

  @Enum({ items: () => InvitationStatus, nativeEnumName: 'iam_invitation_status', type: 'text' })
  declare status: InvitationStatus;

  @Property({ fieldName: 'issued_at', type: 'timestamptz' })
  declare issuedAt: Date;

  @Property({ fieldName: 'expires_at', type: 'timestamptz' })
  declare expiresAt: Date;

  @Property({ fieldName: 'accepted_at', nullable: true, type: 'timestamptz' })
  declare acceptedAt: Date | null;

  @Property({ fieldName: 'revoked_at', nullable: true, type: 'timestamptz' })
  declare revokedAt: Date | null;

  @Property({ fieldName: 'invited_by', type: 'uuid' })
  declare invitedBy: string;
}
