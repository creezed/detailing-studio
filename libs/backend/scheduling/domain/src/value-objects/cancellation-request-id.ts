import type { IIdGenerator } from '@det/backend-shared-ddd';
import { CancellationRequestId as SharedId } from '@det/shared-types';
import type { CancellationRequestId as SharedIdType } from '@det/shared-types';

export type CancellationRequestId = SharedIdType;

export const CancellationRequestId = {
  from(value: string): CancellationRequestId {
    return SharedId.from(value);
  },

  generate(idGen: IIdGenerator): CancellationRequestId {
    return SharedId.from(idGen.generate());
  },
};
