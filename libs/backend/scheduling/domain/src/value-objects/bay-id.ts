import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BayId as SharedBayId } from '@det/shared-types';
import type { BayId as SharedBayIdType } from '@det/shared-types';

export type BayId = SharedBayIdType;

export const BayId = {
  from(value: string): BayId {
    return SharedBayId.from(value);
  },

  generate(idGen: IIdGenerator): BayId {
    return SharedBayId.from(idGen.generate());
  },
};
