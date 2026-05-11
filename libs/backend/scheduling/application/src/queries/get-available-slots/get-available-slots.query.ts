import type { BranchId, MasterId } from '@det/backend-scheduling-domain';
import type { DateTime } from '@det/backend-shared-ddd';
import type { ServiceId } from '@det/shared-types';

import type { VehicleBodyType } from '../../ports/crm-vehicle.port';

export interface GetAvailableSlotsQueryProps {
  readonly branchId: BranchId;
  readonly services: readonly ServiceId[];
  readonly bodyType: VehicleBodyType;
  readonly masterId?: MasterId;
  readonly from?: DateTime;
  readonly to?: DateTime;
}

export class GetAvailableSlotsQuery {
  readonly branchId: BranchId;
  readonly services: readonly ServiceId[];
  readonly bodyType: VehicleBodyType;
  readonly masterId?: MasterId;
  readonly from?: DateTime;
  readonly to?: DateTime;

  constructor(props: GetAvailableSlotsQueryProps) {
    this.branchId = props.branchId;
    this.services = props.services;
    this.bodyType = props.bodyType;
    this.masterId = props.masterId;
    this.from = props.from;
    this.to = props.to;
  }
}
