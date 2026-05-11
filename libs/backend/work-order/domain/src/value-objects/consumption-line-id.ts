import type { IIdGenerator } from '@det/backend-shared-ddd';
import { ConsumptionLineId as SharedConsumptionLineId } from '@det/shared-types';
import type { ConsumptionLineId as SharedConsumptionLineIdType } from '@det/shared-types';

export type ConsumptionLineId = SharedConsumptionLineIdType;

export const ConsumptionLineId = {
  from(value: string): ConsumptionLineId {
    return SharedConsumptionLineId.from(value);
  },

  generate(idGen: IIdGenerator): ConsumptionLineId {
    return SharedConsumptionLineId.from(idGen.generate());
  },
};
