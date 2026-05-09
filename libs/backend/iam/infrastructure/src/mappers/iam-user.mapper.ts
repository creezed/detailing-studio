import { Role, User } from '@det/backend-iam-domain';

import { IamUserSchema } from '../persistence/iam-user.schema';

export function mapIamUserToDomain(schema: IamUserSchema): User {
  const role = schema.roleSet[0] ?? Role.CLIENT;

  return User.restore({
    branchIds: schema.branchIds,
    createdAt: schema.createdAt.toISOString(),
    email: schema.email ?? '',
    fullName: schema.fullName,
    id: schema.id,
    passwordHash: schema.passwordHash,
    phone: schema.phone ?? '',
    role,
    status: schema.status,
    updatedAt: schema.updatedAt?.toISOString() ?? null,
  });
}

export function mapIamUserToPersistence(
  domain: User,
  existing: IamUserSchema | null,
): IamUserSchema {
  const schema = existing ?? new IamUserSchema();
  const snapshot = domain.toSnapshot();

  schema.branchIds = [...snapshot.branchIds];
  schema.createdAt = new Date(snapshot.createdAt);
  schema.email = snapshot.email;
  schema.fullName = snapshot.fullName;
  schema.id = snapshot.id;
  schema.passwordHash = snapshot.passwordHash;
  schema.phone = snapshot.phone;
  schema.roleSet = [snapshot.role];
  schema.status = snapshot.status;
  schema.updatedAt = snapshot.updatedAt === null ? null : new Date(snapshot.updatedAt);

  return schema;
}
