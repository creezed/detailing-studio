import { Inject, Injectable } from '@nestjs/common';

import type { IIdGenerator } from '@det/backend-shared-ddd';

import { ID_GENERATOR, VISIT_HISTORY_WRITE_PORT } from '../di/tokens';
import {
  APPOINTMENT_CANCELLED_TYPE,
  APPOINTMENT_CONFIRMED_TYPE,
  APPOINTMENT_NO_SHOWED_TYPE,
  APPOINTMENT_RESCHEDULED_TYPE,
  AppointmentCancelledSchema,
  AppointmentConfirmedSchema,
  AppointmentNoShowedSchema,
  AppointmentRescheduledSchema,
} from './event-schemas/scheduling-events.schema';
import {
  WORK_ORDER_CLOSED_TYPE,
  WORK_ORDER_OPENED_TYPE,
  WorkOrderClosedSchema,
  WorkOrderOpenedSchema,
} from './event-schemas/work-order-events.schema';

import type { IVisitHistoryWritePort, UpsertVisitHistoryData } from '../ports/visit-history.port';
import type { AppointmentConfirmedPayload } from './event-schemas/scheduling-events.schema';

export interface OutboxEvent {
  readonly eventType: string;
  readonly payload: unknown;
}

@Injectable()
export class VisitHistoryProjector {
  constructor(
    @Inject(VISIT_HISTORY_WRITE_PORT) private readonly _writePort: IVisitHistoryWritePort,
    @Inject(ID_GENERATOR) private readonly _idGen: IIdGenerator,
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    switch (event.eventType) {
      case APPOINTMENT_CONFIRMED_TYPE:
        return this.onAppointmentConfirmed(event.payload);
      case APPOINTMENT_RESCHEDULED_TYPE:
        return this.onAppointmentRescheduled(event.payload);
      case APPOINTMENT_CANCELLED_TYPE:
        return this.onAppointmentCancelled(event.payload);
      case APPOINTMENT_NO_SHOWED_TYPE:
        return this.onAppointmentNoShowed(event.payload);
      case WORK_ORDER_OPENED_TYPE:
        return this.onWorkOrderOpened(event.payload);
      case WORK_ORDER_CLOSED_TYPE:
        return this.onWorkOrderClosed(event.payload);
      default:
        return;
    }
  }

  async onClientAnonymized(clientId: string): Promise<void> {
    await this._writePort.clearPhotosForClient(clientId);
  }

  private async onAppointmentConfirmed(payload: unknown): Promise<void> {
    const parsed = AppointmentConfirmedSchema.parse(payload);

    const data: UpsertVisitHistoryData = {
      id: this._idGen.generate(),
      clientId: parsed.clientId,
      vehicleId: parsed.vehicleId,
      appointmentId: parsed.appointmentId,
      workOrderId: null,
      branchId: parsed.branchId,
      masterId: parsed.masterId,
      servicesSummary: parsed.services,
      scheduledAt: parsed.scheduledAt,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      status: 'SCHEDULED',
      totalAmountCents: null,
      materialsTotalCents: null,
      photoCount: 0,
      beforePhotoUrls: null,
      afterPhotoUrls: null,
    };

    await this._writePort.upsert(data);
  }

  private async onAppointmentRescheduled(payload: unknown): Promise<void> {
    const parsed = AppointmentRescheduledSchema.parse(payload);

    await this._writePort.updateByAppointmentId(parsed.appointmentId, {
      scheduledAt: parsed.newScheduledAt,
    });
  }

  private async onAppointmentCancelled(payload: unknown): Promise<void> {
    const parsed = AppointmentCancelledSchema.parse(payload);

    await this._writePort.updateByAppointmentId(parsed.appointmentId, {
      status: 'CANCELLED',
      cancelledAt: parsed.cancelledAt,
    });
  }

  private async onAppointmentNoShowed(payload: unknown): Promise<void> {
    const parsed = AppointmentNoShowedSchema.parse(payload);

    await this._writePort.updateByAppointmentId(parsed.appointmentId, {
      status: 'NO_SHOW',
    });
  }

  private async onWorkOrderOpened(payload: unknown): Promise<void> {
    const parsed = WorkOrderOpenedSchema.parse(payload);

    await this._writePort.updateByAppointmentId(parsed.appointmentId, {
      workOrderId: parsed.workOrderId,
      startedAt: parsed.startedAt,
    });
  }

  private async onWorkOrderClosed(payload: unknown): Promise<void> {
    const parsed = WorkOrderClosedSchema.parse(payload);

    await this._writePort.updateByAppointmentId(parsed.appointmentId, {
      status: 'COMPLETED',
      completedAt: parsed.completedAt,
      totalAmountCents: parsed.totalAmountCents,
      materialsTotalCents: parsed.materialsTotalCents,
      photoCount: parsed.photoCount,
      beforePhotoUrls: parsed.beforePhotoUrls,
      afterPhotoUrls: parsed.afterPhotoUrls,
    });
  }

  static supportedEventTypes(): readonly string[] {
    return [
      APPOINTMENT_CONFIRMED_TYPE,
      APPOINTMENT_RESCHEDULED_TYPE,
      APPOINTMENT_CANCELLED_TYPE,
      APPOINTMENT_NO_SHOWED_TYPE,
      WORK_ORDER_OPENED_TYPE,
      WORK_ORDER_CLOSED_TYPE,
    ] as const;
  }

  static parsesEvent(eventType: string, payload: unknown): AppointmentConfirmedPayload | null {
    if (eventType === APPOINTMENT_CONFIRMED_TYPE) {
      return AppointmentConfirmedSchema.parse(payload);
    }

    return null;
  }
}
