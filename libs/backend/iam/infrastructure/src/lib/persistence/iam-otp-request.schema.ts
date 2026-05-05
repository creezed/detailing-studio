import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';

import { OtpPurpose, OtpRequestStatus } from '@det/backend/iam/domain';

@Entity({ tableName: 'iam_otp_request' })
export class IamOtpRequestSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ type: 'text' })
  declare phone: string;

  @Property({ type: 'text' })
  declare purpose: OtpPurpose;

  @Property({ fieldName: 'code_hash', type: 'text' })
  declare codeHash: string;

  @Property({ fieldName: 'attempts_left', type: 'int' })
  declare attemptsLeft: number;

  @Enum({ items: () => OtpRequestStatus, nativeEnumName: 'iam_otp_request_status', type: 'text' })
  declare status: OtpRequestStatus;

  @Property({ fieldName: 'expires_at', type: 'timestamptz' })
  declare expiresAt: Date;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'verified_at', nullable: true, type: 'timestamptz' })
  declare verifiedAt: Date | null;
}
