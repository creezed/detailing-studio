import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import {
  AppointmentNotFoundError,
  GetAppointmentByIdQuery,
  GetTodayAppointmentsForMasterQuery,
} from '@det/backend-scheduling-application';
import type { AppointmentReadModel } from '@det/backend-scheduling-application';
import type {
  ISchedulingAppointmentPort,
  SchedulingAppointmentReadModel,
} from '@det/backend-work-order-application';
import { AppointmentId, MasterId } from '@det/shared-types';

@Injectable()
export class WoSchedulingAppointmentPortAdapter implements ISchedulingAppointmentPort {
  constructor(private readonly queryBus: QueryBus) {}

  async getById(appointmentId: string): Promise<SchedulingAppointmentReadModel | null> {
    try {
      const appt = await this.queryBus.execute<GetAppointmentByIdQuery, AppointmentReadModel>(
        new GetAppointmentByIdQuery(AppointmentId.from(appointmentId)),
      );

      return {
        id: appt.id,
        slotEnd: appt.slotEnd,
        slotStart: appt.slotStart,
        status: appt.status,
      };
    } catch (error) {
      if (error instanceof AppointmentNotFoundError) {
        return null;
      }

      throw error;
    }
  }

  async listByMasterAndDay(
    masterId: string,
    date: string,
  ): Promise<readonly SchedulingAppointmentReadModel[]> {
    const appointments = await this.queryBus.execute<
      GetTodayAppointmentsForMasterQuery,
      readonly AppointmentReadModel[]
    >(new GetTodayAppointmentsForMasterQuery(MasterId.from(masterId), date));

    return appointments.map((appt) => ({
      id: appt.id,
      slotEnd: appt.slotEnd,
      slotStart: appt.slotStart,
      status: appt.status,
    }));
  }
}
