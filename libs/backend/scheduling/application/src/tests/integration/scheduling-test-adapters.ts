import { Bay, Branch, BranchSchedule, MasterSchedule } from '@det/backend-scheduling-domain';
import type {
  BayId,
  BranchId,
  IBayRepository,
  IBranchRepository,
  IBranchScheduleRepository,
  IMasterScheduleRepository,
  MasterId,
  ScheduleId,
} from '@det/backend-scheduling-domain';
import type { DomainEvent } from '@det/backend-shared-ddd';

import {
  deserializeScheduleExceptions,
  deserializeUnavailabilities,
  deserializeWeeklyPattern,
  scheduleExceptionsToReadModel,
  serializeScheduleExceptions,
  serializeUnavailabilities,
  serializeWeeklyPattern,
  unavailabilitiesToReadModel,
  weeklyPatternToReadModel,
} from './scheduling-test-serializers';

import type {
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
    'truncate table sch_master_schedules, sch_branch_schedules, sch_bays, sch_branches, outbox_events',
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
