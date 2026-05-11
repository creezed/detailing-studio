import type { IIdGenerator } from '@det/backend-shared-ddd';
import { UnavailabilityId as SharedUnavailabilityId } from '@det/shared-types';
import type { UnavailabilityId as SharedUnavailabilityIdType } from '@det/shared-types';

export type UnavailabilityId = SharedUnavailabilityIdType;

export const UnavailabilityId = {
  from(value: string): UnavailabilityId {
    return SharedUnavailabilityId.from(value);
  },

  generate(idGen: IIdGenerator): UnavailabilityId {
    return SharedUnavailabilityId.from(idGen.generate());
  },
};
