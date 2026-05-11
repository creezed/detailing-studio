import type { AppointmentId } from '@det/backend-scheduling-domain';
import type { DateTime } from '@det/backend-shared-ddd';

export class CompleteAppointmentCommand {
  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly completedAt: DateTime,
  ) {}
}
