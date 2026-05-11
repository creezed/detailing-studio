import { MikroORM, OptimisticLockError } from '@mikro-orm/core';
import { PostgreSqlDriver, type EntityManager } from '@mikro-orm/postgresql';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

import {
  Appointment,
  AppointmentId,
  AppointmentServiceId,
  AppointmentStatus,
  Bay,
  BayId,
  Branch,
  BranchId,
  BranchSchedule,
  CreationChannel,
  DayOfWeek,
  MasterId,
  MasterSchedule,
  ScheduleException,
  ScheduleId,
  TimeOfDay,
  TimeRange,
  TimeSlot,
  Timezone,
  WorkingDay,
} from '@det/backend-scheduling-domain';
import { DateTime, Money } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { OutboxEventSchema, OutboxService } from '@det/backend-shared-outbox';

import { AppointmentServiceSchema } from '../../persistence/appointment-service.schema';
import { AppointmentSchema } from '../../persistence/appointment.schema';
import { BaySchema } from '../../persistence/bay.schema';
import { BranchScheduleExceptionSchema } from '../../persistence/branch-schedule-exception.schema';
import { BranchScheduleSchema } from '../../persistence/branch-schedule.schema';
import { BranchSchema } from '../../persistence/branch.schema';
import { MasterScheduleSchema } from '../../persistence/master-schedule.schema';
import { MasterUnavailabilitySchema } from '../../persistence/master-unavailability.schema';
import { AppointmentRepository } from '../../repositories/appointment.repository';
import { BayRepository } from '../../repositories/bay.repository';
import { BranchScheduleRepository } from '../../repositories/branch-schedule.repository';
import { BranchRepository } from '../../repositories/branch.repository';
import { MasterScheduleRepository } from '../../repositories/master-schedule.repository';

const NOW = DateTime.from('2026-05-11T09:00:00.000Z');
const BRANCH_ID = '11111111-1111-4111-8111-111111111111';
const BAY_ID = '22222222-2222-4222-8222-222222222222';
const BAY_2_ID = '22222222-2222-4222-8222-222222222223';
const BRANCH_SCHEDULE_ID = '33333333-3333-4333-8333-333333333333';
const MASTER_SCHEDULE_ID = '44444444-4444-4444-8444-444444444444';
const UNAVAILABILITY_ID = '55555555-5555-4555-8555-555555555555';
const APPOINTMENT_ID = '66666666-6666-4666-8666-666666666666';
const APPOINTMENT_2_ID = '77777777-7777-4777-8777-777777777777';
const APPOINTMENT_3_ID = '88888888-8888-4888-8888-888888888888';
const MASTER_ID = '99999999-9999-4999-8999-999999999999';
const MASTER_2_ID = '99999999-9999-4999-8999-999999999998';
const CLIENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VEHICLE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ACTOR_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SERVICE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const APPOINTMENT_SERVICE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

class QueueIdGenerator implements IIdGenerator {
  private index = 0;

  constructor(private readonly values: readonly string[]) {}

  generate(): string {
    const value = this.values[this.index];
    this.index += 1;

    if (value === undefined) {
      throw new Error('No queued id value');
    }

    return value;
  }
}

function branchRepo(em: EntityManager): BranchRepository {
  return new BranchRepository(em, new OutboxService());
}

function bayRepo(em: EntityManager): BayRepository {
  return new BayRepository(em, new OutboxService());
}

function branchScheduleRepo(em: EntityManager): BranchScheduleRepository {
  return new BranchScheduleRepository(em, new OutboxService());
}

function masterScheduleRepo(em: EntityManager): MasterScheduleRepository {
  return new MasterScheduleRepository(em, new OutboxService());
}

function appointmentRepo(em: EntityManager): AppointmentRepository {
  return new AppointmentRepository(em, new OutboxService());
}

function createBranch(): Branch {
  return Branch.create({
    address: 'Москва, Тестовая, 1',
    idGen: new QueueIdGenerator([BRANCH_ID]),
    name: 'Main Branch',
    now: NOW,
    timezone: 'Europe/Moscow',
  });
}

function createBay(id = BAY_ID, branchId = BRANCH_ID): Bay {
  return Bay.create({
    branchId,
    idGen: new QueueIdGenerator([id]),
    name: id === BAY_ID ? 'Bay 1' : 'Bay 2',
    now: NOW,
  });
}

function weeklyPattern(): ReadonlyMap<DayOfWeek, WorkingDay | null> {
  const workingDay = WorkingDay.from({
    breakEnd: TimeOfDay.from(14, 0),
    breakStart: TimeOfDay.from(13, 0),
    close: TimeOfDay.from(18, 0),
    open: TimeOfDay.from(9, 0),
  });

  return new Map<DayOfWeek, WorkingDay | null>([
    [DayOfWeek.MONDAY, workingDay],
    [DayOfWeek.TUESDAY, workingDay],
    [DayOfWeek.WEDNESDAY, workingDay],
    [DayOfWeek.THURSDAY, workingDay],
    [DayOfWeek.FRIDAY, workingDay],
    [DayOfWeek.SATURDAY, null],
    [DayOfWeek.SUNDAY, null],
  ]);
}

function createBranchSchedule(): BranchSchedule {
  const schedule = BranchSchedule.create({
    branchId: BRANCH_ID,
    idGen: new QueueIdGenerator([BRANCH_SCHEDULE_ID]),
    now: NOW,
    weeklyPattern: weeklyPattern(),
  });
  schedule.addException(
    ScheduleException.from({
      customRange: TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(16, 0)),
      date: '2026-05-12',
      isClosed: false,
      reason: 'short day',
    }),
    NOW,
  );

  return schedule;
}

function createMasterSchedule(): MasterSchedule {
  const schedule = MasterSchedule.create({
    branchId: BRANCH_ID,
    idGen: new QueueIdGenerator([MASTER_SCHEDULE_ID]),
    masterId: MASTER_ID,
    now: NOW,
    weeklyPattern: weeklyPattern(),
  });
  schedule.addUnavailability(
    DateTime.from('2026-05-12T11:00:00.000Z'),
    DateTime.from('2026-05-12T12:00:00.000Z'),
    'training',
    new QueueIdGenerator([UNAVAILABILITY_ID]),
    NOW,
  );

  return schedule;
}

function createAppointment(props: {
  readonly id: string;
  readonly bayId: string | null;
  readonly masterId: string;
  readonly startsAt: string;
  readonly endsAt: string;
}): Appointment {
  return Appointment.create({
    bayId: props.bayId,
    branchId: BRANCH_ID,
    clientId: CLIENT_ID,
    createdBy: ACTOR_ID,
    createdVia: CreationChannel.MANAGER,
    idGen: new QueueIdGenerator([props.id]),
    masterId: props.masterId,
    now: NOW,
    services: [
      {
        durationMinutesSnapshot: 60,
        id: AppointmentServiceId.from(APPOINTMENT_SERVICE_ID),
        priceSnapshot: Money.rub(5000),
        serviceId: SERVICE_ID,
        serviceNameSnapshot: 'Полировка кузова',
      },
    ],
    slot: TimeSlot.from(
      DateTime.from(props.startsAt),
      DateTime.from(props.endsAt),
      Timezone.from('Europe/Moscow'),
    ),
    vehicleId: VEHICLE_ID,
  });
}

async function seedBranchAndBays(em: EntityManager): Promise<void> {
  await branchRepo(em).save(createBranch());
  await bayRepo(em).save(createBay());
  await bayRepo(em).save(createBay(BAY_2_ID));
  em.clear();
}

async function outboxCount(em: EntityManager): Promise<number> {
  return em.count(OutboxEventSchema, {});
}

function requireFound<T>(value: T | null, entityName: string): T {
  if (value === null) {
    throw new Error(`${entityName} was not found`);
  }

  return value;
}

function sqlState(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const code = Reflect.get(error, 'code');
  if (typeof code === 'string') {
    return code;
  }

  return sqlState(Reflect.get(error, 'cause'));
}

describe('Scheduling infrastructure repositories', () => {
  let container: StartedTestContainer;
  let orm: MikroORM<PostgreSqlDriver>;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'scheduling_infrastructure',
        POSTGRES_PASSWORD: 'scheduling',
        POSTGRES_USER: 'scheduling',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    orm = await MikroORM.init<PostgreSqlDriver>({
      clientUrl: `postgres://scheduling:scheduling@${container.getHost()}:${String(container.getMappedPort(5432))}/scheduling_infrastructure`,
      driver: PostgreSqlDriver,
      entities: [
        BranchSchema,
        BaySchema,
        BranchScheduleSchema,
        BranchScheduleExceptionSchema,
        MasterScheduleSchema,
        MasterUnavailabilitySchema,
        AppointmentSchema,
        AppointmentServiceSchema,
        OutboxEventSchema,
      ],
    });

    await orm.schema.createSchema();
    await orm.em.execute('create extension if not exists "btree_gist";');
    await orm.em.execute(`alter table "sch_appointment"
      add constraint "sch_appointment_master_no_overlap"
      exclude using gist (
        "master_user_id" with =,
        tstzrange("starts_at", "ends_at", '[)') with &&
      ) where ("status" in ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS'));`);
    await orm.em.execute(`alter table "sch_appointment"
      add constraint "sch_appointment_bay_no_overlap"
      exclude using gist (
        "bay_id" with =,
        tstzrange("starts_at", "ends_at", '[)') with &&
      ) where ("bay_id" is not null and "status" in ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS'));`);
  }, 60_000);

  afterAll(async () => {
    await orm.close(true);
    await container.stop();
  });

  beforeEach(async () => {
    await orm.em.execute(
      'truncate table outbox_events, sch_appointment_service, sch_appointment, sch_master_unavailability, sch_master_schedule, sch_branch_schedule_exception, sch_branch_schedule, sch_bay, sch_branch cascade',
    );
  });

  it('saves and restores Branch and Bay aggregates', async () => {
    const em = orm.em.fork();
    const branch = createBranch();
    const bay = createBay();

    await branchRepo(em).save(branch);
    await bayRepo(em).save(bay);

    em.clear();
    const foundBranch = requireFound(
      await branchRepo(em).findById(BranchId.from(BRANCH_ID)),
      'Branch',
    );
    const foundBay = requireFound(await bayRepo(em).findById(BayId.from(BAY_ID)), 'Bay');
    const bays = await bayRepo(em).findByBranch(BranchId.from(BRANCH_ID));

    expect(foundBranch.toSnapshot()).toEqual(branch.toSnapshot());
    expect(foundBay.toSnapshot()).toEqual(bay.toSnapshot());
    expect(bays.map((item) => item.id)).toEqual([BayId.from(BAY_ID)]);
  });

  it('saves and restores BranchSchedule and MasterSchedule child records', async () => {
    const em = orm.em.fork();
    const branch = createBranch();
    const branchSchedule = createBranchSchedule();
    const masterSchedule = createMasterSchedule();

    await branchRepo(em).save(branch);
    await branchScheduleRepo(em).save(branchSchedule);
    await masterScheduleRepo(em).save(masterSchedule);

    em.clear();
    const foundBranchSchedule = requireFound(
      await branchScheduleRepo(em).findById(ScheduleId.from(BRANCH_SCHEDULE_ID)),
      'BranchSchedule',
    );
    const foundMasterSchedule = requireFound(
      await masterScheduleRepo(em).findById(ScheduleId.from(MASTER_SCHEDULE_ID)),
      'MasterSchedule',
    );

    expect(foundBranchSchedule.toSnapshot()).toEqual(branchSchedule.toSnapshot());
    expect(foundMasterSchedule.toSnapshot()).toEqual(masterSchedule.toSnapshot());
  });

  it('saves Appointment, restores child services, queries overlaps and writes outbox', async () => {
    const em = orm.em.fork();
    await seedBranchAndBays(em);
    const appointment = createAppointment({
      bayId: BAY_ID,
      endsAt: '2026-05-12T10:00:00.000Z',
      id: APPOINTMENT_ID,
      masterId: MASTER_ID,
      startsAt: '2026-05-12T09:00:00.000Z',
    });

    await appointmentRepo(em).save(appointment);

    em.clear();
    const found = requireFound(
      await appointmentRepo(em).findById(AppointmentId.from(APPOINTMENT_ID)),
      'Appointment',
    );
    const overlappingMaster = await appointmentRepo(em).findOverlappingForMaster(
      MasterId.from(MASTER_ID),
      TimeSlot.from(
        DateTime.from('2026-05-12T09:30:00.000Z'),
        DateTime.from('2026-05-12T10:30:00.000Z'),
        Timezone.from('Europe/Moscow'),
      ),
    );
    const page = await appointmentRepo(em).listByFilter({
      branchId: BranchId.from(BRANCH_ID),
      limit: 10,
      status: AppointmentStatus.CONFIRMED,
    });

    expect(found.toSnapshot()).toEqual({ ...appointment.toSnapshot(), version: 1 });
    expect(overlappingMaster.map((item) => item.id)).toEqual([AppointmentId.from(APPOINTMENT_ID)]);
    expect(page.items.map((item) => item.id)).toEqual([AppointmentId.from(APPOINTMENT_ID)]);
    expect(await outboxCount(em)).toBe(4);
  });

  it('throws OptimisticLockError when saving a stale Appointment version', async () => {
    const seedEm = orm.em.fork();
    await seedBranchAndBays(seedEm);
    await appointmentRepo(seedEm).save(
      createAppointment({
        bayId: BAY_ID,
        endsAt: '2026-05-12T10:00:00.000Z',
        id: APPOINTMENT_ID,
        masterId: MASTER_ID,
        startsAt: '2026-05-12T09:00:00.000Z',
      }),
    );

    const em1 = orm.em.fork();
    const em2 = orm.em.fork();
    const loaded1 = requireFound(
      await appointmentRepo(em1).findById(AppointmentId.from(APPOINTMENT_ID)),
      'Appointment',
    );
    const loaded2 = requireFound(
      await appointmentRepo(em2).findById(AppointmentId.from(APPOINTMENT_ID)),
      'Appointment',
    );

    loaded1.startWork(ACTOR_ID, NOW);
    await appointmentRepo(em1).save(loaded1);
    loaded2.startWork(ACTOR_ID, DateTime.from('2026-05-11T09:05:00.000Z'));

    await expect(appointmentRepo(em2).save(loaded2)).rejects.toBeInstanceOf(OptimisticLockError);
  });

  it('rejects overlapping active appointments for the same Master and Bay', async () => {
    const em = orm.em.fork();
    await seedBranchAndBays(em);
    await appointmentRepo(em).save(
      createAppointment({
        bayId: BAY_ID,
        endsAt: '2026-05-12T10:00:00.000Z',
        id: APPOINTMENT_ID,
        masterId: MASTER_ID,
        startsAt: '2026-05-12T09:00:00.000Z',
      }),
    );

    await expectOverlapViolation(
      appointmentRepo(orm.em.fork()).save(
        createAppointment({
          bayId: BAY_2_ID,
          endsAt: '2026-05-12T10:30:00.000Z',
          id: APPOINTMENT_2_ID,
          masterId: MASTER_ID,
          startsAt: '2026-05-12T09:30:00.000Z',
        }),
      ),
    );
    await expectOverlapViolation(
      appointmentRepo(orm.em.fork()).save(
        createAppointment({
          bayId: BAY_ID,
          endsAt: '2026-05-12T10:30:00.000Z',
          id: APPOINTMENT_3_ID,
          masterId: MASTER_2_ID,
          startsAt: '2026-05-12T09:30:00.000Z',
        }),
      ),
    );
  });
});

async function expectOverlapViolation(promise: Promise<void>): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(sqlState(error)).toBe('23P01');
    return;
  }

  throw new Error('Expected overlap exclusion constraint violation');
}
