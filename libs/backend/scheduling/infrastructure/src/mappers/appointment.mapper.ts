import { Appointment } from '@det/backend-scheduling-domain';

import {
  deserializeAppointmentService,
  deserializeCancellationRequest,
  serializeCancellationRequest,
} from './scheduling-json.mapper';
import { AppointmentServiceSchema } from '../persistence/appointment-service.schema';
import { AppointmentSchema } from '../persistence/appointment.schema';

export function mapAppointmentToDomain(schema: AppointmentSchema): Appointment {
  return Appointment.restore({
    bayId: schema.bayId,
    branchId: schema.branchId,
    cancellationRequest: deserializeCancellationRequest(schema.cancellationRequest),
    clientId: schema.clientId,
    createdAt: schema.createdAt.toISOString(),
    createdBy: schema.createdBy,
    createdVia: schema.creationChannel,
    id: schema.id,
    masterId: schema.masterId,
    services: schema.services.getItems().map((service) =>
      deserializeAppointmentService({
        durationMinutesSnapshot: service.durationMinutesSnapshot,
        id: service.id,
        priceCents: service.priceCentsSnapshot,
        serviceId: service.serviceId,
        serviceNameSnapshot: service.serviceNameSnapshot,
      }),
    ),
    slotEnd: schema.endsAt.toISOString(),
    slotStart: schema.startsAt.toISOString(),
    status: schema.status,
    timezone: schema.timezone,
    vehicleId: schema.vehicleId,
    version: schema.version,
  });
}

export function mapAppointmentToPersistence(
  appointment: Appointment,
  existing: AppointmentSchema | null,
): AppointmentSchema {
  const schema = existing ?? new AppointmentSchema();
  const snapshot = appointment.toSnapshot();

  schema.bayId = snapshot.bayId;
  schema.branchId = snapshot.branchId;
  schema.cancellationRequest = serializeCancellationRequest(snapshot.cancellationRequest);
  schema.clientId = snapshot.clientId;
  schema.createdAt = new Date(snapshot.createdAt);
  schema.createdBy = snapshot.createdBy;
  schema.creationChannel = snapshot.createdVia;
  schema.endsAt = new Date(snapshot.slotEnd);
  schema.id = snapshot.id;
  schema.masterId = snapshot.masterId;
  schema.startsAt = new Date(snapshot.slotStart);
  schema.status = snapshot.status;
  schema.timezone = snapshot.timezone;
  schema.vehicleId = snapshot.vehicleId;
  if (existing === null) {
    schema.version = snapshot.version;
  }
  schema.services.removeAll();

  for (const service of snapshot.services) {
    const item = new AppointmentServiceSchema();
    item.appointment = schema;
    item.durationMinutesSnapshot = service.durationMinutesSnapshot;
    item.id = service.id;
    item.priceCentsSnapshot = service.priceSnapshot.cents.toString();
    item.serviceId = service.serviceId;
    item.serviceNameSnapshot = service.serviceNameSnapshot;
    schema.services.add(item);
  }

  return schema;
}
