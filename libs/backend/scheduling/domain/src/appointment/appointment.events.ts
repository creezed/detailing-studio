import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { AppointmentId } from '../value-objects/appointment-id';
import type { AppointmentStatus } from '../value-objects/appointment-status';
import type { CreationChannel } from '../value-objects/creation-channel';

const APPOINTMENT_AGGREGATE_TYPE = 'Appointment';

function apptEventProps(appointmentId: AppointmentId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: appointmentId,
    aggregateType: APPOINTMENT_AGGREGATE_TYPE,
    eventId: `${eventType}:${appointmentId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export interface AppointmentServiceSnapshot {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly durationMinutes: number;
  readonly priceCents: bigint;
}

export class AppointmentCreated extends DomainEvent {
  readonly eventType = 'AppointmentCreated';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly clientId: string,
    public readonly vehicleId: string,
    public readonly branchId: string,
    public readonly bayId: string | null,
    public readonly masterId: string,
    public readonly services: readonly AppointmentServiceSnapshot[],
    public readonly slotStart: string,
    public readonly slotEnd: string,
    public readonly timezone: string,
    public readonly status: AppointmentStatus,
    public readonly createdVia: CreationChannel,
    public readonly createdBy: string,
    public readonly createdAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentCreated', createdAt));
  }
}

export class AppointmentConfirmed extends DomainEvent {
  readonly eventType = 'AppointmentConfirmed';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly confirmedBy: string,
    public readonly confirmedAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentConfirmed', confirmedAt));
  }
}

export class AppointmentRescheduled extends DomainEvent {
  readonly eventType = 'AppointmentRescheduled';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly oldSlotStart: string,
    public readonly oldSlotEnd: string,
    public readonly newSlotStart: string,
    public readonly newSlotEnd: string,
    public readonly oldMasterId: string,
    public readonly newMasterId: string,
    public readonly oldBayId: string | null,
    public readonly newBayId: string | null,
    public readonly rescheduledBy: string,
    public readonly rescheduledAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentRescheduled', rescheduledAt));
  }
}

export class AppointmentCancelled extends DomainEvent {
  readonly eventType = 'AppointmentCancelled';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly reason: string,
    public readonly cancelledBy: string,
    public readonly cancelledAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentCancelled', cancelledAt));
  }
}

export class AppointmentCancellationRequested extends DomainEvent {
  readonly eventType = 'AppointmentCancellationRequested';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly requestedBy: string,
    public readonly reason: string,
    public readonly requestedAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentCancellationRequested', requestedAt));
  }
}

export class AppointmentCancellationApproved extends DomainEvent {
  readonly eventType = 'AppointmentCancellationApproved';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly approvedBy: string,
    public readonly approvedAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentCancellationApproved', approvedAt));
  }
}

export class AppointmentCancellationRejected extends DomainEvent {
  readonly eventType = 'AppointmentCancellationRejected';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly rejectedBy: string,
    public readonly reason: string,
    public readonly rejectedAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentCancellationRejected', rejectedAt));
  }
}

export class AppointmentStarted extends DomainEvent {
  readonly eventType = 'AppointmentStarted';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly masterId: string,
    public readonly branchId: string,
    public readonly clientId: string,
    public readonly vehicleId: string,
    public readonly slotStart: string,
    public readonly slotEnd: string,
    public readonly services: readonly AppointmentServiceSnapshot[],
    public readonly startedBy: string,
    public readonly startedAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentStarted', startedAt));
  }
}

export class AppointmentCompleted extends DomainEvent {
  readonly eventType = 'AppointmentCompleted';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly completedAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentCompleted', completedAt));
  }
}

export class AppointmentMarkedNoShow extends DomainEvent {
  readonly eventType = 'AppointmentMarkedNoShow';

  constructor(
    public readonly appointmentId: AppointmentId,
    public readonly markedBy: string,
    public readonly markedAt: DateTime,
  ) {
    super(apptEventProps(appointmentId, 'AppointmentMarkedNoShow', markedAt));
  }
}
