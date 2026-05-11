import { Branch } from '@det/backend-scheduling-domain';

import { BranchSchema } from '../persistence/branch.schema';

export function mapBranchToDomain(schema: BranchSchema): Branch {
  return Branch.restore({
    address: schema.address,
    createdAt: schema.createdAt.toISOString(),
    id: schema.id,
    isActive: schema.isActive,
    name: schema.name,
    timezone: schema.timezone,
  });
}

export function mapBranchToPersistence(
  branch: Branch,
  existing: BranchSchema | null,
): BranchSchema {
  const schema = existing ?? new BranchSchema();
  const snapshot = branch.toSnapshot();

  schema.address = snapshot.address;
  schema.createdAt = new Date(snapshot.createdAt);
  schema.id = snapshot.id;
  schema.isActive = snapshot.isActive;
  schema.name = snapshot.name;
  schema.timezone = snapshot.timezone;

  return schema;
}
