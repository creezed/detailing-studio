import type { IIdGenerator } from '@det/backend-shared-ddd';
import { ScheduleId as SharedScheduleId } from '@det/shared-types';
import type { ScheduleId as SharedScheduleIdType } from '@det/shared-types';

export type ScheduleId = SharedScheduleIdType;

export const ScheduleId = {
  from(value: string): ScheduleId {
    return SharedScheduleId.from(value);
  },

  generate(idGen: IIdGenerator): ScheduleId {
    return SharedScheduleId.from(idGen.generate());
  },
};
