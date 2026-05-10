import type { IIdGenerator } from '@det/backend-shared-ddd';
import { VehicleId as SharedVehicleId } from '@det/shared-types';
import type { VehicleId as SharedVehicleIdType } from '@det/shared-types';

export type VehicleId = SharedVehicleIdType;

export const VehicleId = {
  from(value: string): VehicleId {
    return SharedVehicleId.from(value);
  },

  generate(idGen: IIdGenerator): VehicleId {
    return SharedVehicleId.from(idGen.generate());
  },
};
