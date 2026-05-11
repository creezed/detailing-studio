import type { AppointmentId } from '@det/backend-scheduling-domain';
import type { DateTime } from '@det/backend-shared-ddd';

export interface WorkOrderAppointmentServiceSnapshot {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly durationMinutes: number;
  readonly priceCents: string;
}

export interface OpenWorkOrderFromAppointmentSnapshot {
  readonly appointmentId: AppointmentId;
  readonly masterId: string;
  readonly branchId: string;
  readonly clientId: string;
  readonly vehicleId: string;
  readonly slotStart: string;
  readonly slotEnd: string;
  readonly services: readonly WorkOrderAppointmentServiceSnapshot[];
  readonly startedBy: string;
  readonly startedAt: DateTime;
}

export interface IWorkOrderPort {
  openFromAppointment(snapshot: OpenWorkOrderFromAppointmentSnapshot): Promise<void>;
}
