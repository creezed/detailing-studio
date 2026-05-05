import { OtpRequest } from '@det/backend/iam/domain';

import { IamOtpRequestSchema } from '../persistence/iam-otp-request.schema';

export function mapIamOtpRequestToDomain(
  schema: IamOtpRequestSchema,
  compare: (rawCode: string, codeHash: string) => boolean,
): OtpRequest {
  return OtpRequest.restore(
    {
      attemptsLeft: schema.attemptsLeft,
      codeHash: schema.codeHash,
      expiresAt: schema.expiresAt.toISOString(),
      id: schema.id,
      issuedAt: schema.createdAt.toISOString(),
      phone: schema.phone,
      purpose: schema.purpose,
      status: schema.status,
      verifiedAt: schema.verifiedAt?.toISOString() ?? null,
    },
    compare,
  );
}

export function mapIamOtpRequestToPersistence(
  domain: OtpRequest,
  existing: IamOtpRequestSchema | null,
): IamOtpRequestSchema {
  const schema = existing ?? new IamOtpRequestSchema();
  const snapshot = domain.toSnapshot();

  schema.attemptsLeft = snapshot.attemptsLeft;
  schema.codeHash = snapshot.codeHash;
  schema.createdAt = new Date(snapshot.issuedAt);
  schema.expiresAt = new Date(snapshot.expiresAt);
  schema.id = snapshot.id;
  schema.phone = snapshot.phone;
  schema.purpose = snapshot.purpose;
  schema.status = snapshot.status;
  schema.verifiedAt = snapshot.verifiedAt === null ? null : new Date(snapshot.verifiedAt);

  return schema;
}
