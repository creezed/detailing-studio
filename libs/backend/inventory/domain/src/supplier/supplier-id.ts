import type { IIdGenerator } from '@det/backend-shared-ddd';
import { SupplierId as SharedSupplierId } from '@det/shared-types';
import type { SupplierId as SharedSupplierIdType } from '@det/shared-types';

export type SupplierId = SharedSupplierIdType;

export const SupplierId = {
  from(value: string): SupplierId {
    return SharedSupplierId.from(value);
  },

  generate(idGen: IIdGenerator): SupplierId {
    return SharedSupplierId.from(idGen.generate());
  },
};
