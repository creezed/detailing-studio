import { Invitation } from '@det/backend/iam/domain';

import { IamInvitationSchema } from '../persistence/iam-invitation.schema';

export function mapIamInvitationToDomain(
  schema: IamInvitationSchema,
  hashFn: (value: string) => string,
): Invitation {
  return Invitation.restore(
    {
      branchIds: schema.branchIds,
      email: schema.email,
      expiresAt: schema.expiresAt.toISOString(),
      id: schema.id,
      invitedBy: schema.invitedBy,
      role: schema.role,
      status: schema.status,
      tokenHash: schema.tokenHash,
    },
    hashFn,
  );
}

export function mapIamInvitationToPersistence(
  domain: Invitation,
  existing: IamInvitationSchema | null,
): IamInvitationSchema {
  const schema = existing ?? new IamInvitationSchema();
  const snapshot = domain.toSnapshot();

  schema.branchIds = [...snapshot.branchIds];
  schema.email = snapshot.email;
  schema.expiresAt = new Date(snapshot.expiresAt);
  schema.id = snapshot.id;
  schema.invitedBy = snapshot.invitedBy;
  schema.role = snapshot.role;
  schema.status = snapshot.status;
  schema.tokenHash = snapshot.tokenHash;

  return schema;
}
