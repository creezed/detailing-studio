import type { IIdGenerator } from '@det/backend-shared-ddd';
import { StockTakingId as SharedStockTakingId } from '@det/shared-types';
import type { StockTakingId as SharedStockTakingIdType } from '@det/shared-types';

export type StockTakingId = SharedStockTakingIdType;

export const StockTakingId = {
  from(value: string): StockTakingId {
    return SharedStockTakingId.from(value);
  },

  generate(idGen: IIdGenerator): StockTakingId {
    return SharedStockTakingId.from(idGen.generate());
  },
};
