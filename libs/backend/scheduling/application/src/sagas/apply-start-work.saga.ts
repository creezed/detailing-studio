import { Inject, Optional } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { AppointmentStarted } from '@det/backend-scheduling-domain';

import { WORK_ORDER_PORT } from '../di/tokens';

import type { IWorkOrderPort } from '../ports/work-order.port';

@EventsHandler(AppointmentStarted)
export class ApplyStartWorkSaga implements IEventHandler<AppointmentStarted> {
  constructor(
    @Inject(WORK_ORDER_PORT) @Optional() private readonly workOrderPort?: IWorkOrderPort,
  ) {}

  async handle(event: AppointmentStarted): Promise<void> {
    if (this.workOrderPort === undefined) {
      return;
    }

    await this.workOrderPort.openFromAppointment({
      appointmentId: event.appointmentId,
      branchId: event.branchId,
      clientId: event.clientId,
      masterId: event.masterId,
      services: event.services.map((service) => ({
        durationMinutes: service.durationMinutes,
        id: service.id,
        priceCents: String(service.priceCents),
        serviceId: service.serviceId,
        serviceName: service.serviceName,
      })),
      slotEnd: event.slotEnd,
      slotStart: event.slotStart,
      startedAt: event.startedAt,
      startedBy: event.startedBy,
      vehicleId: event.vehicleId,
    });
  }
}
