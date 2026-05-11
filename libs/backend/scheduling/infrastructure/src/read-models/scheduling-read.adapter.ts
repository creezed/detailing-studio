import { Injectable } from '@nestjs/common';

import type {
  IAppointmentReadPort,
  ListAppointmentsFilter,
  AppointmentCancellationRequestReadModel,
  AppointmentReadModel,
  CursorPaginatedResult,
} from '@det/backend-scheduling-application';
import type {
  Appointment,
  AppointmentId,
  CancellationRequest,
  MasterId,
} from '@det/backend-scheduling-domain';
import type { ClientId } from '@det/shared-types';

import { AppointmentRepository } from '../repositories/appointment.repository';

@Injectable()
export class AppointmentReadAdapter implements IAppointmentReadPort {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async getById(appointmentId: AppointmentId): Promise<AppointmentReadModel | null> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    return appointment === null ? null : appointmentToReadModel(appointment);
  }

  async list(filter: ListAppointmentsFilter): Promise<CursorPaginatedResult<AppointmentReadModel>> {
    const page = await this.appointmentRepository.listByFilter({
      branchId: filter.branchId,
      clientId: filter.clientId,
      cursor: filter.cursor,
      from: filter.from === undefined ? undefined : new Date(filter.from),
      limit: filter.limit,
      masterId: filter.masterId,
      status: filter.status,
      to: filter.to === undefined ? undefined : new Date(filter.to),
    });

    return {
      items: page.items.map(appointmentToReadModel),
      nextCursor: page.nextCursor,
    };
  }

  async listByMasterAndDay(
    masterId: MasterId,
    date: string,
  ): Promise<readonly AppointmentReadModel[]> {
    const appointments = await this.appointmentRepository.findByMasterAndDay(masterId, date);
    return appointments.map(appointmentToReadModel);
  }

  async listByClient(
    clientId: ClientId,
    limit = 50,
    cursor?: string,
  ): Promise<readonly AppointmentReadModel[]> {
    const page = await this.appointmentRepository.findByClient(clientId, limit, cursor);
    return page.items.map(appointmentToReadModel);
  }
}

function appointmentToReadModel(appointment: Appointment): AppointmentReadModel {
  const snapshot = appointment.toSnapshot();

  return {
    bayId: snapshot.bayId,
    branchId: snapshot.branchId,
    cancellationRequest: cancellationRequestToReadModel(snapshot.cancellationRequest),
    clientId: snapshot.clientId,
    createdAt: snapshot.createdAt,
    createdBy: snapshot.createdBy,
    createdVia: snapshot.createdVia,
    id: snapshot.id,
    masterId: snapshot.masterId,
    services: snapshot.services.map((service) => ({
      durationMinutes: service.durationMinutesSnapshot,
      id: service.id,
      priceAmount: service.priceSnapshot.toNumber().toFixed(2),
      serviceId: service.serviceId,
      serviceName: service.serviceNameSnapshot,
    })),
    slotEnd: snapshot.slotEnd,
    slotStart: snapshot.slotStart,
    status: snapshot.status,
    timezone: snapshot.timezone,
    vehicleId: snapshot.vehicleId,
  };
}

function cancellationRequestToReadModel(
  request: CancellationRequest | null,
): AppointmentCancellationRequestReadModel | null {
  if (request === null) {
    return null;
  }

  return {
    decidedAt: request.decidedAt?.iso() ?? null,
    decidedBy: request.decidedBy,
    decisionReason: request.decisionReason,
    id: request.id,
    reason: request.reason,
    requestedAt: request.requestedAt.iso(),
    requestedBy: request.requestedBy,
    status: request.status,
  };
}
