import { LockMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { AppointmentStatus } from '@det/backend-scheduling-domain';
import type {
  Appointment,
  AppointmentDateRange,
  AppointmentId,
  AppointmentListFilter,
  AppointmentListResult,
  BayId,
  BranchId,
  IAppointmentRepository,
  MasterId,
  TimeSlot,
} from '@det/backend-scheduling-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import { mapAppointmentToDomain, mapAppointmentToPersistence } from '../mappers/appointment.mapper';
import { AppointmentSchema } from '../persistence/appointment.schema';

import type { FilterQuery } from '@mikro-orm/core';

const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.PENDING_CONFIRMATION,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
] as const;

const DEFAULT_LIST_LIMIT = 50;

interface AppointmentCursor {
  readonly startsAt: Date;
  readonly id: string;
}

interface AppointmentOwnerFilter {
  readonly bayId?: BayId;
  readonly masterId?: MasterId;
}

interface DateRangeFilter {
  readonly $gte?: Date;
  readonly $lt?: Date;
}

@Injectable()
export class AppointmentRepository implements IAppointmentRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: AppointmentId): Promise<Appointment | null> {
    const schema = await this.em.findOne(AppointmentSchema, { id }, { populate: ['services'] });
    return schema === null ? null : mapAppointmentToDomain(schema);
  }

  async save(appointment: Appointment): Promise<void> {
    const snapshot = appointment.toSnapshot();
    const existing = await this.em.findOne(
      AppointmentSchema,
      { id: snapshot.id },
      {
        lockMode: LockMode.OPTIMISTIC,
        lockVersion: snapshot.version,
        populate: ['services'],
      },
    );
    const persisted = mapAppointmentToPersistence(appointment, existing);
    const events = appointment.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }

  findOverlappingForMaster(
    masterId: MasterId,
    slot: TimeSlot,
    excludeAppointmentId?: AppointmentId,
  ): Promise<readonly Appointment[]> {
    return this.findOverlapping({ masterId }, slot, excludeAppointmentId);
  }

  findOverlappingForBay(
    bayId: BayId,
    slot: TimeSlot,
    excludeAppointmentId?: AppointmentId,
  ): Promise<readonly Appointment[]> {
    return this.findOverlapping({ bayId }, slot, excludeAppointmentId);
  }

  async listByFilter(filter: AppointmentListFilter): Promise<AppointmentListResult> {
    const limit = filter.limit ?? DEFAULT_LIST_LIMIT;
    const where = buildListWhere(filter);
    const schemas = await this.em.find(AppointmentSchema, where, {
      limit: limit + 1,
      orderBy: { startsAt: 'ASC', id: 'ASC' },
      populate: ['services'],
    });
    const items = schemas.slice(0, limit);
    const extra = schemas[limit];

    return {
      items: items.map(mapAppointmentToDomain),
      nextCursor: extra === undefined ? null : nextCursor(items),
    };
  }

  findByClient(clientId: string, limit: number, cursor?: string): Promise<AppointmentListResult> {
    return this.listByFilter({ clientId, cursor, limit });
  }

  async findByMasterAndDay(masterId: MasterId, date: string): Promise<readonly Appointment[]> {
    const range = utcDayRange(date);
    const schemas = await this.em.find(
      AppointmentSchema,
      {
        masterId,
        startsAt: { $gte: range.from, $lt: range.to },
      },
      { orderBy: { startsAt: 'ASC' }, populate: ['services'] },
    );

    return schemas.map(mapAppointmentToDomain);
  }

  async findActiveByBranch(
    branchId: BranchId,
    dateRange: AppointmentDateRange,
  ): Promise<readonly Appointment[]> {
    const schemas = await this.em.find(
      AppointmentSchema,
      {
        branchId,
        endsAt: { $gt: dateRange.from },
        startsAt: { $lt: dateRange.to },
        status: { $in: [...ACTIVE_APPOINTMENT_STATUSES] },
      },
      { orderBy: { startsAt: 'ASC' }, populate: ['services'] },
    );

    return schemas.map(mapAppointmentToDomain);
  }

  private async findOverlapping(
    ownerFilter: AppointmentOwnerFilter,
    slot: TimeSlot,
    excludeAppointmentId?: AppointmentId,
  ): Promise<readonly Appointment[]> {
    const where: FilterQuery<AppointmentSchema> = {
      endsAt: { $gt: slot.start.toDate() },
      startsAt: { $lt: slot.end.toDate() },
      status: { $in: [...ACTIVE_APPOINTMENT_STATUSES] },
    };

    if (ownerFilter.masterId !== undefined) {
      where.masterId = ownerFilter.masterId;
    }
    if (ownerFilter.bayId !== undefined) {
      where.bayId = ownerFilter.bayId;
    }
    if (excludeAppointmentId !== undefined) {
      where.id = { $ne: excludeAppointmentId };
    }

    const schemas = await this.em.find(AppointmentSchema, where, {
      orderBy: { startsAt: 'ASC' },
      populate: ['services'],
    });

    return schemas.map(mapAppointmentToDomain);
  }
}

function buildListWhere(filter: AppointmentListFilter): FilterQuery<AppointmentSchema> {
  const where: FilterQuery<AppointmentSchema> = {};

  if (filter.branchId !== undefined) {
    where.branchId = filter.branchId;
  }
  if (filter.clientId !== undefined) {
    where.clientId = filter.clientId;
  }
  if (filter.masterId !== undefined) {
    where.masterId = filter.masterId;
  }
  if (filter.status !== undefined) {
    where.status = filter.status;
  }
  if (filter.from !== undefined || filter.to !== undefined) {
    where.startsAt = dateRangeFilter(filter.from, filter.to);
  }
  if (filter.cursor !== undefined) {
    const cursor = parseCursor(filter.cursor);
    where.$or = [
      { startsAt: { $gt: cursor.startsAt } },
      { id: { $gt: cursor.id }, startsAt: cursor.startsAt },
    ];
  }

  return where;
}

function dateRangeFilter(from?: Date, to?: Date): DateRangeFilter {
  const filter: DateRangeFilter = {
    ...(from === undefined ? {} : { $gte: from }),
    ...(to === undefined ? {} : { $lt: to }),
  };

  return filter;
}

function nextCursor(items: readonly AppointmentSchema[]): string | null {
  const last = items[items.length - 1];
  return last === undefined ? null : `${last.startsAt.toISOString()}|${last.id}`;
}

function parseCursor(cursor: string): AppointmentCursor {
  const separatorIndex = cursor.indexOf('|');
  if (separatorIndex < 0) {
    return { id: '', startsAt: new Date(cursor) };
  }

  return {
    id: cursor.slice(separatorIndex + 1),
    startsAt: new Date(cursor.slice(0, separatorIndex)),
  };
}

function utcDayRange(date: string): AppointmentDateRange {
  const from = new Date(`${date}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}
