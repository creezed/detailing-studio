import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BranchId as SharedBranchId } from '@det/shared-types';
import type { BranchId as SharedBranchIdType } from '@det/shared-types';

export type BranchId = SharedBranchIdType;

export const BranchId = {
  from(value: string): BranchId {
    return SharedBranchId.from(value);
  },

  generate(idGen: IIdGenerator): BranchId {
    return SharedBranchId.from(idGen.generate());
  },
};
