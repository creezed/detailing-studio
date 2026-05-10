import type { IIdGenerator } from '@det/backend-shared-ddd';
import { AdjustmentId as SharedAdjustmentId } from '@det/shared-types';
import type { AdjustmentId as SharedAdjustmentIdType } from '@det/shared-types';

export type AdjustmentId = SharedAdjustmentIdType;

export const AdjustmentId = {
  from(value: string): AdjustmentId {
    return SharedAdjustmentId.from(value);
  },

  generate(idGen: IIdGenerator): AdjustmentId {
    return SharedAdjustmentId.from(idGen.generate());
  },
};
