import type { IIdGenerator } from '@det/backend-shared-ddd';
import { AppointmentServiceId as SharedId } from '@det/shared-types';
import type { AppointmentServiceId as SharedIdType } from '@det/shared-types';

export type AppointmentServiceId = SharedIdType;

export const AppointmentServiceId = {
  from(value: string): AppointmentServiceId {
    return SharedId.from(value);
  },

  generate(idGen: IIdGenerator): AppointmentServiceId {
    return SharedId.from(idGen.generate());
  },
};
