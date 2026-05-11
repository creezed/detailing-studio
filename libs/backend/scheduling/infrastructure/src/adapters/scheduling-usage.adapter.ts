import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { IBayUsagePort, IBranchUsagePort } from '@det/backend-scheduling-application';
import { AppointmentStatus } from '@det/backend-scheduling-domain';

import { AppointmentSchema } from '../persistence/appointment.schema';

const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.PENDING_CONFIRMATION,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
] as const;

@Injectable()
export class BranchUsageAdapter implements IBranchUsagePort {
  constructor(private readonly em: EntityManager) {}

  async hasActiveAppointments(branchId: string): Promise<boolean> {
    const count = await this.em.count(AppointmentSchema, {
      branchId,
      status: { $in: [...ACTIVE_APPOINTMENT_STATUSES] },
    });
    return count > 0;
  }
}

@Injectable()
export class BayUsageAdapter implements IBayUsagePort {
  constructor(private readonly em: EntityManager) {}

  async hasFutureAppointments(bayId: string): Promise<boolean> {
    const count = await this.em.count(AppointmentSchema, {
      bayId,
      startsAt: { $gte: new Date() },
      status: { $in: [...ACTIVE_APPOINTMENT_STATUSES] },
    });
    return count > 0;
  }
}
