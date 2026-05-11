import type { IIdGenerator } from '@det/backend-shared-ddd';
import { WorkOrderId as SharedWorkOrderId } from '@det/shared-types';
import type { WorkOrderId as SharedWorkOrderIdType } from '@det/shared-types';

export type WorkOrderId = SharedWorkOrderIdType;

export const WorkOrderId = {
  from(value: string): WorkOrderId {
    return SharedWorkOrderId.from(value);
  },

  generate(idGen: IIdGenerator): WorkOrderId {
    return SharedWorkOrderId.from(idGen.generate());
  },
};
