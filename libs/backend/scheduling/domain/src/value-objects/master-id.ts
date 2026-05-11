import type { IIdGenerator } from '@det/backend-shared-ddd';
import { MasterId as SharedMasterId } from '@det/shared-types';
import type { MasterId as SharedMasterIdType } from '@det/shared-types';

export type MasterId = SharedMasterIdType;

export const MasterId = {
  from(value: string): MasterId {
    return SharedMasterId.from(value);
  },

  generate(idGen: IIdGenerator): MasterId {
    return SharedMasterId.from(idGen.generate());
  },
};
