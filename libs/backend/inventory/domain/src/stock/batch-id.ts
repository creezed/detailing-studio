import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BatchId as SharedBatchId } from '@det/shared-types';
import type { BatchId as SharedBatchIdType } from '@det/shared-types';

export type BatchId = SharedBatchIdType;

export const BatchId = {
  from(value: string): BatchId {
    return SharedBatchId.from(value);
  },

  generate(idGen: IIdGenerator): BatchId {
    return SharedBatchId.from(idGen.generate());
  },
};
