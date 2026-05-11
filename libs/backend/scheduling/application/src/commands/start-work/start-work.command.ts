import type { AppointmentId } from '@det/backend-scheduling-domain';
import type { UserId } from '@det/shared-types';

export class StartWorkCommand {
  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly by: UserId,
  ) {}
}
