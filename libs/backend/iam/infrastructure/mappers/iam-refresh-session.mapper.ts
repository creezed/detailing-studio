import { RefreshSession } from '@det/backend/iam/domain';

import { IamRefreshSessionSchema } from '../persistence/iam-refresh-session.schema';

export function mapIamRefreshSessionToDomain(schema: IamRefreshSessionSchema): RefreshSession {
  return RefreshSession.restore({
    compromisedAt: schema.compromisedAt?.toISOString() ?? null,
    expiresAt: schema.expiresAt.toISOString(),
    id: schema.id,
    issuedAt: schema.issuedAt.toISOString(),
    lastRotatedAt: schema.lastRotatedAt?.toISOString() ?? null,
    revokedAt: schema.revokedAt?.toISOString() ?? null,
    revokedBy: schema.revokedBy,
    rotatedTokenHashes: schema.rotatedTokenHashes,
    rotationCounter: schema.rotationCounter,
    status: schema.status,
    tokenHash: schema.tokenHash,
    userId: schema.userId,
  });
}

export function mapIamRefreshSessionToPersistence(
  domain: RefreshSession,
  existing: IamRefreshSessionSchema | null,
): IamRefreshSessionSchema {
  const schema = existing ?? new IamRefreshSessionSchema();
  const snapshot = domain.toSnapshot();

  schema.compromisedAt = snapshot.compromisedAt === null ? null : new Date(snapshot.compromisedAt);
  schema.expiresAt = new Date(snapshot.expiresAt);
  schema.id = snapshot.id;
  schema.issuedAt = new Date(snapshot.issuedAt);
  schema.lastRotatedAt = snapshot.lastRotatedAt === null ? null : new Date(snapshot.lastRotatedAt);
  schema.revokedAt = snapshot.revokedAt === null ? null : new Date(snapshot.revokedAt);
  schema.revokedBy = snapshot.revokedBy;
  schema.rotatedTokenHashes = [...snapshot.rotatedTokenHashes];
  schema.rotationCounter = snapshot.rotationCounter;
  schema.status = snapshot.status;
  schema.tokenHash = snapshot.tokenHash;
  schema.userId = snapshot.userId;

  return schema;
}
