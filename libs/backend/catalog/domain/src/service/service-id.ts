import type { IIdGenerator } from '@det/backend-shared-ddd';
import { ServiceId as SharedServiceId } from '@det/shared-types';
import type { ServiceId as SharedServiceIdType } from '@det/shared-types';

export type ServiceId = SharedServiceIdType;

export const ServiceId = {
  from(value: string): ServiceId {
    return SharedServiceId.from(value);
  },

  generate(idGen: IIdGenerator): ServiceId {
    return SharedServiceId.from(idGen.generate());
  },
};
