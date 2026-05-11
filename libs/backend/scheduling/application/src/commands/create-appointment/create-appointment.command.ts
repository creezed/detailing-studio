import type { BayId, BranchId, MasterId, TimeSlot } from '@det/backend-scheduling-domain';
import type { ClientId, ServiceId, UserId, VehicleId } from '@det/shared-types';

export type AppointmentCreationChannel = 'ONLINE' | 'MANAGER' | 'GUEST';

export class CreateAppointmentCommand {
  constructor(
    public readonly clientId: ClientId,
    public readonly vehicleId: VehicleId,
    public readonly branchId: BranchId,
    public readonly masterId: MasterId,
    public readonly serviceIds: readonly ServiceId[],
    public readonly slot: TimeSlot,
    public readonly bayId: BayId | null,
    public readonly createdBy: UserId,
    public readonly createdVia: AppointmentCreationChannel,
  ) {}
}
