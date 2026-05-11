import type { AppointmentId } from '@det/backend-scheduling-domain';

export class GetAppointmentByIdQuery {
  constructor(public readonly appointmentId: AppointmentId) {}
}
