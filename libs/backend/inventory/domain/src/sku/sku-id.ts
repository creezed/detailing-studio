import type { IIdGenerator } from '@det/backend-shared-ddd';
import { SkuId as SharedSkuId } from '@det/shared-types';
import type { SkuId as SharedSkuIdType } from '@det/shared-types';

export type SkuId = SharedSkuIdType;

export const SkuId = {
  from(value: string): SkuId {
    return SharedSkuId.from(value);
  },

  generate(idGen: IIdGenerator): SkuId {
    return SharedSkuId.from(idGen.generate());
  },
};
