import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import {
  AppointmentNotFoundError,
  GetAppointmentByIdQuery,
  GetTodayAppointmentsForMasterQuery,
  ListAppointmentsQuery,
} from '@det/backend-scheduling-application';
import type {
  AppointmentReadModel,
  CursorPaginatedResult,
  ISchedulingAppointmentPort,
} from '@det/backend-scheduling-application';
import type { AppointmentId, MasterId } from '@det/backend-scheduling-domain';
import type { ClientId } from '@det/shared-types';

@Injectable()
export class SchedulingAppointmentPortAdapter implements ISchedulingAppointmentPort {
  constructor(private readonly queryBus: QueryBus) {}

  async getById(appointmentId: AppointmentId): Promise<AppointmentReadModel | null> {
    try {
      return await this.queryBus.execute<GetAppointmentByIdQuery, AppointmentReadModel>(
        new GetAppointmentByIdQuery(appointmentId),
      );
    } catch (error) {
      if (error instanceof AppointmentNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  listByMasterAndDay(masterId: MasterId, date: string): Promise<readonly AppointmentReadModel[]> {
    return this.queryBus.execute<
      GetTodayAppointmentsForMasterQuery,
      readonly AppointmentReadModel[]
    >(new GetTodayAppointmentsForMasterQuery(masterId, date));
  }

  async listByClient(
    clientId: ClientId,
    limit?: number,
    cursor?: string,
  ): Promise<readonly AppointmentReadModel[]> {
    const page = await this.queryBus.execute<
      ListAppointmentsQuery,
      CursorPaginatedResult<AppointmentReadModel>
    >(new ListAppointmentsQuery({ clientId }, limit, cursor));

    return page.items;
  }
}
