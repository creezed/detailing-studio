import {
  Appointment,
  Bay,
  Branch,
  BranchSchedule,
  CancellationRequestId,
  MasterSchedule,
} from '@det/backend-scheduling-domain';
import type {
  AppointmentId,
  AppointmentStatus,
  BayId,
  BranchId,
  CancellationRequest,
  CreationChannel,
  IAppointmentRepository,
  IBayRepository,
  IBranchRepository,
  IBranchScheduleRepository,
  IMasterScheduleRepository,
  MasterId,
  ScheduleId,
  TimeSlot,
} from '@det/backend-scheduling-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { DomainEvent } from '@det/backend-shared-ddd';

import {
  deserializeAppointmentServices,
  deserializeScheduleExceptions,
  deserializeUnavailabilities,
  deserializeWeeklyPattern,
  scheduleExceptionsToReadModel,
  serializeAppointmentServices,
  serializeScheduleExceptions,
  serializeUnavailabilities,
  serializeWeeklyPattern,
  unavailabilitiesToReadModel,
  weeklyPatternToReadModel,
} from './scheduling-test-serializers';

import type {
  AppointmentServiceRecord,
  ScheduleExceptionRecord,
  UnavailabilityRecord,
  WeeklyPatternRecord,
} from './scheduling-test-serializers';
import type { IBayReadPort } from '../../ports/bay-read.port';
import type { IBranchReadPort, ListBranchesFilter } from '../../ports/branch-read.port';
import type { IBranchScheduleReadPort } from '../../ports/branch-schedule-read.port';
import type { IMasterScheduleReadPort } from '../../ports/master-schedule-read.port';
import type {
  BayReadModel,
  BranchDetailReadModel,
  BranchListItemReadModel,
  BranchScheduleReadModel,
  MasterScheduleReadModel,
  PaginatedResult,
} from '../../read-models/scheduling.read-models';
import type { Client, QueryResultRow } from 'pg';

interface OutboxRow extends QueryResultRow {
  readonly event_type: string;
}

interface BranchRow extends QueryResultRow {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly timezone: string;
  readonly is_active: boolean;
  readonly created_at: string;
}

interface BayRow extends QueryResultRow {
  readonly id: string;
  readonly branch_id: string;
  readonly name: string;
  readonly is_active: boolean;
}

interface BranchScheduleRow extends QueryResultRow {
  readonly id: string;
  readonly branch_id: string;
  readonly weekly_pattern: readonly WeeklyPatternRecord[];
  readonly exceptions: readonly ScheduleExceptionRecord[];
}

interface MasterScheduleRow extends QueryResultRow {
  readonly id: string;
  readonly master_id: string;
  readonly branch_id: string;
  readonly weekly_pattern: readonly WeeklyPatternRecord[];
  readonly unavailabilities: readonly UnavailabilityRecord[];
}

interface AppointmentRow extends QueryResultRow {
  readonly id: string;
  readonly client_id: string;
  readonly vehicle_id: string;
  readonly branch_id: string;
  readonly bay_id: string | null;
  readonly master_id: string;
  readonly services: readonly AppointmentServiceRecord[];
  readonly slot_start: string;
  readonly slot_end: string;
  readonly timezone: string;
  readonly status: AppointmentStatus;
  readonly cancellation_request: CancellationRequestRecord | null;
  readonly created_by: string;
  readonly created_via: CreationChannel;
  readonly created_at: string;
  readonly version: number;
}

interface CancellationRequestRecord {
  readonly id: string;
  readonly requestedAt: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly status: CancellationRequest['status'];
  readonly decidedAt: string | null;
  readonly decidedBy: string | null;
  readonly decisionReason: string | null;
}

class OptimisticLockError extends Error {
  constructor() {
    super('Optimistic lock failed');
    this.name = 'OptimisticLockError';
  }
}

export async function createSchedulingTestSchema(client: Client): Promise<void> {
  await client.query(`
    create table if not exists sch_branches (
      id text primary key,
      name text not null,
      address text not null,
      timezone text not null,
      is_active boolean not null,
      created_at text not null
    )
  `);
  await client.query(`
    create table if not exists sch_bays (
      id text primary key,
      branch_id text not null,
      name text not null,
      is_active boolean not null
    )
  `);
  await client.query(`
    create table if not exists sch_branch_schedules (
      id text primary key,
      branch_id text not null unique,
      weekly_pattern jsonb not null,
      exceptions jsonb not null
    )
  `);
  await client.query(`
    create table if not exists sch_master_schedules (
      id text primary key,
      master_id text not null,
      branch_id text not null,
      weekly_pattern jsonb not null,
      unavailabilities jsonb not null,
      unique (master_id, branch_id)
    )
  `);
  await client.query(`
    create table if not exists sch_appointments (
      id text primary key,
      client_id text not null,
      vehicle_id text not null,
      branch_id text not null,
      bay_id text null,
      master_id text not null,
      services jsonb not null,
      slot_start text not null,
      slot_end text not null,
      timezone text not null,
      status text not null,
      cancellation_request jsonb null,
      created_by text not null,
      created_via text not null,
      created_at text not null,
      version integer not null
    )
  `);
  await client.query(`
    create unique index if not exists sch_appointments_master_start_active_idx
      on sch_appointments (master_id, slot_start)
      where status in ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS')
  `);
  await client.query(`
    create unique index if not exists sch_appointments_bay_start_active_idx
      on sch_appointments (bay_id, slot_start)
      where bay_id is not null and status in ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS')
  `);
  await client.query(`
    create table if not exists outbox_events (
      event_id text primary key,
      aggregate_id text not null,
      aggregate_type text not null,
      event_type text not null,
      occurred_at timestamptz not null,
      payload jsonb not null
    )
  `);
}

export async function truncateSchedulingTestSchema(client: Client): Promise<void> {
  await client.query(
    'truncate table sch_appointments, sch_master_schedules, sch_branch_schedules, sch_bays, sch_branches, outbox_events',
  );
}

export async function outboxEventTypes(client: Client): Promise<readonly string[]> {
  const result = await client.query<OutboxRow>(
    'select event_type from outbox_events order by occurred_at, event_id',
  );
  return result.rows.map((row) => row.event_type);
}

export class PostgresBranchRepository implements IBranchRepository {
  constructor(private readonly client: Client) {}

  async findById(id: BranchId): Promise<Branch | null> {
    const result = await this.client.query<BranchRow>('select * from sch_branches where id = $1', [
      id,
    ]);
    const row = result.rows[0];

    return row === undefined ? null : this.toDomain(row);
  }

  async findActive(): Promise<readonly Branch[]> {
    const result = await this.client.query<BranchRow>(
      'select * from sch_branches where is_active = true order by name',
    );
    return result.rows.map((row) => this.toDomain(row));
  }

  async save(branch: Branch): Promise<void> {
    const snapshot = branch.toSnapshot();
    const events = branch.pullDomainEvents();

    await this.client.query('begin');
    try {
      await this.client.query(
        `insert into sch_branches (id, name, address, timezone, is_active, created_at)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set
           name = excluded.name,
           address = excluded.address,
           timezone = excluded.timezone,
           is_active = excluded.is_active,
           created_at = excluded.created_at`,
        [
          snapshot.id,
          snapshot.name,
          snapshot.address,
          snapshot.timezone,
          snapshot.isActive,
          snapshot.createdAt,
        ],
      );
      await insertEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  private toDomain(row: BranchRow): Branch {
    return Branch.restore({
      address: row.address,
      createdAt: row.created_at,
      id: row.id,
      isActive: row.is_active,
      name: row.name,
      timezone: row.timezone,
    });
  }
}

export class PostgresBayRepository implements IBayRepository {
  constructor(private readonly client: Client) {}

  async findById(id: BayId): Promise<Bay | null> {
    const result = await this.client.query<BayRow>('select * from sch_bays where id = $1', [id]);
    const row = result.rows[0];

    return row === undefined ? null : this.toDomain(row);
  }

  async findByBranch(branchId: BranchId): Promise<readonly Bay[]> {
    const result = await this.client.query<BayRow>(
      'select * from sch_bays where branch_id = $1 order by name',
      [branchId],
    );
    return result.rows.map((row) => this.toDomain(row));
  }

  async save(bay: Bay): Promise<void> {
    const snapshot = bay.toSnapshot();
    const events = bay.pullDomainEvents();

    await this.client.query('begin');
    try {
      await this.client.query(
        `insert into sch_bays (id, branch_id, name, is_active)
         values ($1, $2, $3, $4)
         on conflict (id) do update set
           branch_id = excluded.branch_id,
           name = excluded.name,
           is_active = excluded.is_active`,
        [snapshot.id, snapshot.branchId, snapshot.name, snapshot.isActive],
      );
      await insertEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  private toDomain(row: BayRow): Bay {
    return Bay.restore({
      branchId: row.branch_id,
      id: row.id,
      isActive: row.is_active,
      name: row.name,
    });
  }
}

export class PostgresBranchScheduleRepository implements IBranchScheduleRepository {
  constructor(private readonly client: Client) {}

  async findById(id: ScheduleId): Promise<BranchSchedule | null> {
    const result = await this.client.query<BranchScheduleRow>(
      'select * from sch_branch_schedules where id = $1',
      [id],
    );
    const row = result.rows[0];

    return row === undefined ? null : this.toDomain(row);
  }

  async findByBranchId(branchId: BranchId): Promise<BranchSchedule | null> {
    const result = await this.client.query<BranchScheduleRow>(
      'select * from sch_branch_schedules where branch_id = $1',
      [branchId],
    );
    const row = result.rows[0];

    return row === undefined ? null : this.toDomain(row);
  }

  async save(schedule: BranchSchedule): Promise<void> {
    const snapshot = schedule.toSnapshot();
    const events = schedule.pullDomainEvents();

    await this.client.query('begin');
    try {
      await this.client.query(
        `insert into sch_branch_schedules (id, branch_id, weekly_pattern, exceptions)
         values ($1, $2, $3::jsonb, $4::jsonb)
         on conflict (id) do update set
           branch_id = excluded.branch_id,
           weekly_pattern = excluded.weekly_pattern,
           exceptions = excluded.exceptions`,
        [
          snapshot.id,
          snapshot.branchId,
          JSON.stringify(serializeWeeklyPattern(snapshot.weeklyPattern)),
          JSON.stringify(serializeScheduleExceptions(snapshot.exceptions)),
        ],
      );
      await insertEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  private toDomain(row: BranchScheduleRow): BranchSchedule {
    return BranchSchedule.restore({
      branchId: row.branch_id,
      exceptions: deserializeScheduleExceptions(row.exceptions),
      id: row.id,
      weeklyPattern: deserializeWeeklyPattern(row.weekly_pattern),
    });
  }
}

export class PostgresMasterScheduleRepository implements IMasterScheduleRepository {
  constructor(private readonly client: Client) {}

  async findById(id: ScheduleId): Promise<MasterSchedule | null> {
    const result = await this.client.query<MasterScheduleRow>(
      'select * from sch_master_schedules where id = $1',
      [id],
    );
    const row = result.rows[0];

    return row === undefined ? null : this.toDomain(row);
  }

  async findByMasterAndBranch(
    masterId: MasterId,
    branchId: BranchId,
  ): Promise<MasterSchedule | null> {
    const result = await this.client.query<MasterScheduleRow>(
      'select * from sch_master_schedules where master_id = $1 and branch_id = $2',
      [masterId, branchId],
    );
    const row = result.rows[0];

    return row === undefined ? null : this.toDomain(row);
  }

  async findAllByBranch(branchId: BranchId): Promise<readonly MasterSchedule[]> {
    const result = await this.client.query<MasterScheduleRow>(
      'select * from sch_master_schedules where branch_id = $1 order by master_id',
      [branchId],
    );
    return result.rows.map((row) => this.toDomain(row));
  }

  async save(schedule: MasterSchedule): Promise<void> {
    const snapshot = schedule.toSnapshot();
    const events = schedule.pullDomainEvents();

    await this.client.query('begin');
    try {
      await this.client.query(
        `insert into sch_master_schedules (id, master_id, branch_id, weekly_pattern, unavailabilities)
         values ($1, $2, $3, $4::jsonb, $5::jsonb)
         on conflict (id) do update set
           master_id = excluded.master_id,
           branch_id = excluded.branch_id,
           weekly_pattern = excluded.weekly_pattern,
           unavailabilities = excluded.unavailabilities`,
        [
          snapshot.id,
          snapshot.masterId,
          snapshot.branchId,
          JSON.stringify(serializeWeeklyPattern(snapshot.weeklyPattern)),
          JSON.stringify(serializeUnavailabilities(snapshot.unavailabilities)),
        ],
      );
      await insertEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  private toDomain(row: MasterScheduleRow): MasterSchedule {
    return MasterSchedule.restore({
      branchId: row.branch_id,
      id: row.id,
      masterId: row.master_id,
      unavailabilities: deserializeUnavailabilities(row.unavailabilities),
      weeklyPattern: deserializeWeeklyPattern(row.weekly_pattern),
    });
  }
}

export class PostgresAppointmentRepository implements IAppointmentRepository {
  private remainingOptimisticLockFailures = 0;

  constructor(private readonly client: Client) {}

  failNextSavesWithOptimisticLock(count: number): void {
    this.remainingOptimisticLockFailures = count;
  }

  async findById(id: AppointmentId): Promise<Appointment | null> {
    const result = await this.client.query<AppointmentRow>(
      'select * from sch_appointments where id = $1',
      [id],
    );
    const row = result.rows[0];

    return row === undefined ? null : this.toDomain(row);
  }

  async save(appointment: Appointment): Promise<void> {
    if (this.remainingOptimisticLockFailures > 0) {
      this.remainingOptimisticLockFailures -= 1;
      throw new OptimisticLockError();
    }

    const snapshot = appointment.toSnapshot();
    const events = appointment.pullDomainEvents();

    await this.client.query('begin');
    try {
      const existingResult = await this.client.query<{ readonly version: number }>(
        'select version from sch_appointments where id = $1',
        [snapshot.id],
      );
      const existing = existingResult.rows[0];

      if (existing === undefined) {
        await this.client.query(
          `insert into sch_appointments (
            id, client_id, vehicle_id, branch_id, bay_id, master_id, services,
            slot_start, slot_end, timezone, status, cancellation_request,
            created_by, created_via, created_at, version
          )
          values (
            $1, $2, $3, $4, $5, $6, $7::jsonb,
            $8, $9, $10, $11, $12::jsonb,
            $13, $14, $15, $16
          )`,
          [
            snapshot.id,
            snapshot.clientId,
            snapshot.vehicleId,
            snapshot.branchId,
            snapshot.bayId,
            snapshot.masterId,
            JSON.stringify(serializeAppointmentServices(snapshot.services)),
            snapshot.slotStart,
            snapshot.slotEnd,
            snapshot.timezone,
            snapshot.status,
            stringifyCancellationRequest(snapshot.cancellationRequest),
            snapshot.createdBy,
            snapshot.createdVia,
            snapshot.createdAt,
            snapshot.version,
          ],
        );
      } else {
        const result = await this.client.query(
          `update sch_appointments set
            client_id = $2,
            vehicle_id = $3,
            branch_id = $4,
            bay_id = $5,
            master_id = $6,
            services = $7::jsonb,
            slot_start = $8,
            slot_end = $9,
            timezone = $10,
            status = $11,
            cancellation_request = $12::jsonb,
            created_by = $13,
            created_via = $14,
            created_at = $15,
            version = version + 1
          where id = $1 and version = $16`,
          [
            snapshot.id,
            snapshot.clientId,
            snapshot.vehicleId,
            snapshot.branchId,
            snapshot.bayId,
            snapshot.masterId,
            JSON.stringify(serializeAppointmentServices(snapshot.services)),
            snapshot.slotStart,
            snapshot.slotEnd,
            snapshot.timezone,
            snapshot.status,
            stringifyCancellationRequest(snapshot.cancellationRequest),
            snapshot.createdBy,
            snapshot.createdVia,
            snapshot.createdAt,
            snapshot.version,
          ],
        );
        if (result.rowCount !== 1) {
          throw new OptimisticLockError();
        }
      }

      await insertEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      if (isUniqueViolation(error)) {
        throw new OptimisticLockError();
      }
      throw error;
    }
  }

  async findOverlappingForMaster(
    masterId: MasterId,
    slot: TimeSlot,
    excludeAppointmentId?: AppointmentId,
  ): Promise<readonly Appointment[]> {
    return this.findOverlapping('master_id', masterId, slot, excludeAppointmentId);
  }

  async findOverlappingForBay(
    bayId: BayId,
    slot: TimeSlot,
    excludeAppointmentId?: AppointmentId,
  ): Promise<readonly Appointment[]> {
    return this.findOverlapping('bay_id', bayId, slot, excludeAppointmentId);
  }

  private async findOverlapping(
    column: 'bay_id' | 'master_id',
    ownerId: string,
    slot: TimeSlot,
    excludeAppointmentId?: AppointmentId,
  ): Promise<readonly Appointment[]> {
    const params = [
      ownerId,
      slot.start.iso(),
      slot.end.iso(),
      ['PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS'],
      excludeAppointmentId ?? null,
    ];
    const result = await this.client.query<AppointmentRow>(
      `select * from sch_appointments
       where ${column} = $1
         and slot_start < $3
         and slot_end > $2
         and status = any($4::text[])
         and ($5::text is null or id <> $5)
       order by slot_start`,
      params,
    );

    return result.rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: AppointmentRow): Appointment {
    return Appointment.restore({
      bayId: row.bay_id,
      branchId: row.branch_id,
      cancellationRequest: deserializeCancellationRequest(row.cancellation_request),
      clientId: row.client_id,
      createdAt: row.created_at,
      createdBy: row.created_by,
      createdVia: row.created_via,
      id: row.id,
      masterId: row.master_id,
      services: deserializeAppointmentServices(row.services),
      slotEnd: row.slot_end,
      slotStart: row.slot_start,
      status: row.status,
      timezone: row.timezone,
      vehicleId: row.vehicle_id,
      version: row.version,
    });
  }
}

export class PostgresBranchReadPort implements IBranchReadPort {
  constructor(private readonly client: Client) {}

  async list(filter: ListBranchesFilter): Promise<PaginatedResult<BranchListItemReadModel>> {
    const offset = (filter.page - 1) * filter.pageSize;
    const params = filter.isActive === undefined ? [] : [filter.isActive];
    const whereClause = filter.isActive === undefined ? '' : 'where is_active = $1';
    const totalResult = await this.client.query<{ readonly total: string }>(
      `select count(*)::text as total from sch_branches ${whereClause}`,
      params,
    );
    const listParams = [...params, filter.pageSize, offset];
    const pageSizeParam = listParams.length - 1;
    const offsetParam = listParams.length;
    const result = await this.client.query<BranchRow>(
      `select * from sch_branches ${whereClause} order by name limit $${String(pageSizeParam)} offset $${String(offsetParam)}`,
      listParams,
    );

    return {
      items: result.rows.map((row) => branchRowToListItem(row)),
      total: Number(totalResult.rows[0]?.total ?? '0'),
    };
  }

  async getById(id: string): Promise<BranchDetailReadModel | null> {
    const result = await this.client.query<BranchRow>('select * from sch_branches where id = $1', [
      id,
    ]);
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }

    const scheduleResult = await this.client.query<BranchScheduleRow>(
      'select * from sch_branch_schedules where branch_id = $1',
      [id],
    );
    const scheduleRow = scheduleResult.rows[0];

    return {
      ...branchRowToListItem(row),
      schedule: scheduleRow === undefined ? null : branchScheduleRowToReadModel(scheduleRow),
    };
  }
}

export class PostgresBayReadPort implements IBayReadPort {
  constructor(private readonly client: Client) {}

  async listByBranch(branchId: string): Promise<readonly BayReadModel[]> {
    const result = await this.client.query<BayRow>(
      'select * from sch_bays where branch_id = $1 order by name',
      [branchId],
    );

    return result.rows.map((row) => ({
      branchId: row.branch_id,
      id: row.id,
      isActive: row.is_active,
      name: row.name,
    }));
  }
}

export class PostgresBranchScheduleReadPort implements IBranchScheduleReadPort {
  constructor(private readonly client: Client) {}

  async getByBranchId(branchId: string): Promise<BranchScheduleReadModel | null> {
    const result = await this.client.query<BranchScheduleRow>(
      'select * from sch_branch_schedules where branch_id = $1',
      [branchId],
    );
    const row = result.rows[0];

    return row === undefined ? null : branchScheduleRowToReadModel(row);
  }
}

export class PostgresMasterScheduleReadPort implements IMasterScheduleReadPort {
  constructor(private readonly client: Client) {}

  async getByMasterAndBranch(
    masterId: string,
    branchId: string,
  ): Promise<MasterScheduleReadModel | null> {
    const result = await this.client.query<MasterScheduleRow>(
      'select * from sch_master_schedules where master_id = $1 and branch_id = $2',
      [masterId, branchId],
    );
    const row = result.rows[0];

    return row === undefined ? null : masterScheduleRowToReadModel(row);
  }

  async listByBranch(branchId: string): Promise<readonly MasterScheduleReadModel[]> {
    const result = await this.client.query<MasterScheduleRow>(
      'select * from sch_master_schedules where branch_id = $1 order by master_id',
      [branchId],
    );

    return result.rows.map((row) => masterScheduleRowToReadModel(row));
  }
}

function branchRowToListItem(row: BranchRow): BranchListItemReadModel {
  return {
    address: row.address,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    timezone: row.timezone,
  };
}

function branchScheduleRowToReadModel(row: BranchScheduleRow): BranchScheduleReadModel {
  return {
    branchId: row.branch_id,
    exceptions: scheduleExceptionsToReadModel(row.exceptions),
    id: row.id,
    weeklyPattern: weeklyPatternToReadModel(row.weekly_pattern),
  };
}

function masterScheduleRowToReadModel(row: MasterScheduleRow): MasterScheduleReadModel {
  return {
    branchId: row.branch_id,
    id: row.id,
    masterId: row.master_id,
    unavailabilities: unavailabilitiesToReadModel(row.unavailabilities),
    weeklyPattern: weeklyPatternToReadModel(row.weekly_pattern),
  };
}

function stringifyCancellationRequest(request: CancellationRequest | null): string | null {
  if (request === null) {
    return null;
  }

  return JSON.stringify({
    decidedAt: request.decidedAt?.iso() ?? null,
    decidedBy: request.decidedBy,
    decisionReason: request.decisionReason,
    id: request.id,
    reason: request.reason,
    requestedAt: request.requestedAt.iso(),
    requestedBy: request.requestedBy,
    status: request.status,
  } satisfies CancellationRequestRecord);
}

function deserializeCancellationRequest(
  record: CancellationRequestRecord | null,
): CancellationRequest | null {
  if (record === null) {
    return null;
  }

  return {
    decidedAt: record.decidedAt === null ? null : DateTime.from(record.decidedAt),
    decidedBy: record.decidedBy,
    decisionReason: record.decisionReason,
    id: CancellationRequestId.from(record.id),
    reason: record.reason,
    requestedAt: DateTime.from(record.requestedAt),
    requestedBy: record.requestedBy,
    status: record.status,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && Reflect.get(error, 'code') === '23505';
}

async function insertEvents(client: Client, events: readonly DomainEvent[]): Promise<void> {
  for (const event of events) {
    await client.query(
      `insert into outbox_events (event_id, aggregate_id, aggregate_type, event_type, occurred_at, payload)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        event.eventId,
        event.aggregateId,
        event.aggregateType,
        event.eventType,
        event.occurredAt,
        JSON.stringify({ eventType: event.eventType }),
      ],
    );
  }
}
