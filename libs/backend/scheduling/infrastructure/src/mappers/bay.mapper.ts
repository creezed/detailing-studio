import { Bay } from '@det/backend-scheduling-domain';

import { BaySchema } from '../persistence/bay.schema';

export function mapBayToDomain(schema: BaySchema): Bay {
  return Bay.restore({
    branchId: schema.branchId,
    id: schema.id,
    isActive: schema.isActive,
    name: schema.name,
  });
}

export function mapBayToPersistence(bay: Bay, existing: BaySchema | null): BaySchema {
  const schema = existing ?? new BaySchema();
  const snapshot = bay.toSnapshot();

  schema.branchId = snapshot.branchId;
  schema.id = snapshot.id;
  schema.isActive = snapshot.isActive;
  schema.name = snapshot.name;

  return schema;
}
