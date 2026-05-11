import type { IIdGenerator } from '@det/backend-shared-ddd';
import { AppointmentId as SharedAppointmentId } from '@det/shared-types';
import type { AppointmentId as SharedAppointmentIdType } from '@det/shared-types';

export type AppointmentId = SharedAppointmentIdType;

export const AppointmentId = {
  from(value: string): AppointmentId {
    return SharedAppointmentId.from(value);
  },

  generate(idGen: IIdGenerator): AppointmentId {
    return SharedAppointmentId.from(idGen.generate());
  },
};
