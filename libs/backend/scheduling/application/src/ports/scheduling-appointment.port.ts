import type { AppointmentId, MasterId } from '@det/backend-scheduling-domain';
import type { ClientId } from '@det/shared-types';

import type { AppointmentReadModel } from '../read-models/scheduling.read-models';

export interface ISchedulingAppointmentPort {
  getById(appointmentId: AppointmentId): Promise<AppointmentReadModel | null>;
  listByMasterAndDay(masterId: MasterId, date: string): Promise<readonly AppointmentReadModel[]>;
  listByClient(
    clientId: ClientId,
    limit?: number,
    cursor?: string,
  ): Promise<readonly AppointmentReadModel[]>;
}
