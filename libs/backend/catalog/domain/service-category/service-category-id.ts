import type { IIdGenerator } from '@det/backend/shared/ddd';
import { ServiceCategoryId as SharedServiceCategoryId } from '@det/shared/types';
import type { ServiceCategoryId as SharedServiceCategoryIdType } from '@det/shared/types';

export type ServiceCategoryId = SharedServiceCategoryIdType;

export const ServiceCategoryId = {
  from(value: string): ServiceCategoryId {
    return SharedServiceCategoryId.from(value);
  },

  generate(idGen: IIdGenerator): ServiceCategoryId {
    return SharedServiceCategoryId.from(idGen.generate());
  },
};
