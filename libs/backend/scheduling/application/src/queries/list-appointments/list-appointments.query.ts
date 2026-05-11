import type { AppointmentStatus, BranchId, MasterId } from '@det/backend-scheduling-domain';
import type { ClientId } from '@det/shared-types';

export interface ListAppointmentsQueryFilter {
  readonly branchId?: BranchId;
  readonly clientId?: ClientId;
  readonly masterId?: MasterId;
  readonly dateRange?: {
    readonly from: string;
    readonly to: string;
  };
  readonly status?: AppointmentStatus;
}

export class ListAppointmentsQuery {
  constructor(
    public readonly filter: ListAppointmentsQueryFilter = {},
    public readonly limit = 50,
    public readonly cursor?: string,
  ) {}
}
