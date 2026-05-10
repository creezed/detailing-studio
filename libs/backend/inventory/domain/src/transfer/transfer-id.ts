import type { IIdGenerator } from '@det/backend-shared-ddd';
import { TransferId as SharedTransferId } from '@det/shared-types';
import type { TransferId as SharedTransferIdType } from '@det/shared-types';

export type TransferId = SharedTransferIdType;

export const TransferId = {
  from(value: string): TransferId {
    return SharedTransferId.from(value);
  },

  generate(idGen: IIdGenerator): TransferId {
    return SharedTransferId.from(idGen.generate());
  },
};
