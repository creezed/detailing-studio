import type { AppointmentStatus, BranchId, MasterId } from '@det/backend-scheduling-domain';
import type { AppointmentId, ClientId } from '@det/shared-types';

import type {
  AppointmentReadModel,
  CursorPaginatedResult,
} from '../read-models/scheduling.read-models';

export interface ListAppointmentsFilter {
  readonly branchId?: BranchId;
  readonly clientId?: ClientId;
  readonly masterId?: MasterId;
  readonly from?: string;
  readonly to?: string;
  readonly status?: AppointmentStatus;
  readonly limit: number;
  readonly cursor?: string;
}

export interface IAppointmentReadPort {
  getById(appointmentId: AppointmentId): Promise<AppointmentReadModel | null>;
  list(filter: ListAppointmentsFilter): Promise<CursorPaginatedResult<AppointmentReadModel>>;
  listByMasterAndDay(masterId: MasterId, date: string): Promise<readonly AppointmentReadModel[]>;
  listByClient(
    clientId: ClientId,
    limit?: number,
    cursor?: string,
  ): Promise<readonly AppointmentReadModel[]>;
}
