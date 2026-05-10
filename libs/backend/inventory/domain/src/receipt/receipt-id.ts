import type { IIdGenerator } from '@det/backend-shared-ddd';
import { ReceiptId as SharedReceiptId } from '@det/shared-types';
import type { ReceiptId as SharedReceiptIdType } from '@det/shared-types';

export type ReceiptId = SharedReceiptIdType;

export const ReceiptId = {
  from(value: string): ReceiptId {
    return SharedReceiptId.from(value);
  },

  generate(idGen: IIdGenerator): ReceiptId {
    return SharedReceiptId.from(idGen.generate());
  },
};
