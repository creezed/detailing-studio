import type {
  AppointmentId,
  BayId,
  BranchId,
  MasterId,
  TimeSlot,
} from '@det/backend-scheduling-domain';
import type { UserId } from '@det/shared-types';

export type RescheduleAppointmentActorRole = 'CLIENT' | 'MANAGER' | 'OWNER';

export class RescheduleAppointmentCommand {
  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly branchId: BranchId,
    public readonly masterId: MasterId,
    public readonly slot: TimeSlot,
    public readonly bayId: BayId | null,
    public readonly actorId: UserId,
    public readonly actorRole: RescheduleAppointmentActorRole,
  ) {}
}
