import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { GenericContainer, Wait } from 'testcontainers';

import {
  BayAlreadyDeactivatedError,
  BayId,
  BranchAlreadyActiveError,
  BranchAlreadyDeactivatedError,
  BranchId,
  BranchInUseError,
  DayOfWeek,
  MasterId,
  ScheduleException,
  ScheduleId,
  TimeSlot,
  TimeOfDay,
  TimeRange,
  Timezone,
  UnavailabilityId,
  WorkingDay,
} from '@det/backend-scheduling-domain';
import type { MasterWeeklyPattern, WeeklyPattern } from '@det/backend-scheduling-domain';
import { CLOCK, DateTime, ID_GENERATOR, Money } from '@det/backend-shared-ddd';
import { AppointmentId, ClientId, ServiceId, UserId, VehicleId } from '@det/shared-types';

import {
  createSchedulingTestSchema,
  outboxEventTypes,
  PostgresBayReadPort,
  PostgresBayRepository,
  PostgresBranchReadPort,
  PostgresBranchRepository,
  PostgresAppointmentRepository,
  PostgresBranchScheduleReadPort,
  PostgresBranchScheduleRepository,
  PostgresMasterScheduleReadPort,
  PostgresMasterScheduleRepository,
  truncateSchedulingTestSchema,
} from './scheduling-test-adapters';
import {
  FixedClock,
  InMemoryCatalogServicePort,
  InMemoryBayUsagePort,
  InMemoryBranchUsagePort,
  InMemoryCrmVehiclePort,
  InMemoryIamUserPort,
  QueueIdGenerator,
} from './scheduling-test-primitives';
import { AddBranchScheduleExceptionCommand } from '../../commands/add-branch-schedule-exception/add-branch-schedule-exception.command';
import { AddMasterUnavailabilityCommand } from '../../commands/add-master-unavailability/add-master-unavailability.command';
import { CreateAppointmentCommand } from '../../commands/create-appointment/create-appointment.command';
import { CreateBayCommand } from '../../commands/create-bay/create-bay.command';
import { CreateBranchCommand } from '../../commands/create-branch/create-branch.command';
import { DeactivateBayCommand } from '../../commands/deactivate-bay/deactivate-bay.command';
import { DeactivateBranchCommand } from '../../commands/deactivate-branch/deactivate-branch.command';
import { ReactivateBranchCommand } from '../../commands/reactivate-branch/reactivate-branch.command';
import { RemoveBranchScheduleExceptionCommand } from '../../commands/remove-branch-schedule-exception/remove-branch-schedule-exception.command';
import { RemoveMasterUnavailabilityCommand } from '../../commands/remove-master-unavailability/remove-master-unavailability.command';
import { RescheduleAppointmentCommand } from '../../commands/reschedule-appointment/reschedule-appointment.command';
import { SetBranchScheduleCommand } from '../../commands/set-branch-schedule/set-branch-schedule.command';
import { SetMasterScheduleCommand } from '../../commands/set-master-schedule/set-master-schedule.command';
import { UpdateBayCommand } from '../../commands/update-bay/update-bay.command';
import { UpdateBranchCommand } from '../../commands/update-branch/update-branch.command';
import {
  APPOINTMENT_REPOSITORY,
  BAY_READ_PORT,
  BAY_REPOSITORY,
  BAY_USAGE_PORT,
  BRANCH_READ_PORT,
  BRANCH_REPOSITORY,
  BRANCH_SCHEDULE_READ_PORT,
  BRANCH_SCHEDULE_REPOSITORY,
  BRANCH_USAGE_PORT,
  CATALOG_SERVICE_PORT,
  CRM_VEHICLE_PORT,
  IAM_USER_PORT,
  MASTER_SCHEDULE_READ_PORT,
  MASTER_SCHEDULE_REPOSITORY,
} from '../../di/tokens';
import {
  BayInUseError,
  BayNotFoundError,
  BranchNotFoundError,
  BranchScheduleNotFoundError,
  IamUserNotFoundError,
  MasterScheduleNotFoundError,
  MasterScheduleOutsideBranchHoursError,
  ServiceInactiveError,
  SlotConflictError,
} from '../../errors/application.errors';
import { GetBranchByIdQuery } from '../../queries/get-branch-by-id/get-branch-by-id.query';
import { GetBranchScheduleQuery } from '../../queries/get-branch-schedule/get-branch-schedule.query';
import { GetMasterScheduleQuery } from '../../queries/get-master-schedule/get-master-schedule.query';
import { ListBaysByBranchQuery } from '../../queries/list-bays-by-branch/list-bays-by-branch.query';
import { ListBranchesQuery } from '../../queries/list-branches/list-branches.query';
import { ListMastersByBranchQuery } from '../../queries/list-masters-by-branch/list-masters-by-branch.query';
import { SchedulingApplicationModule } from '../../scheduling-application.module';

import type {
  BayReadModel,
  BranchDetailReadModel,
  BranchScheduleReadModel,
  MasterReadModel,
  MasterScheduleReadModel,
  PaginatedResult,
} from '../../read-models/scheduling.read-models';
import type { AppointmentCommandResult } from '../../services/appointment-command-result';
import type { TestingModule } from '@nestjs/testing';
import type { StartedTestContainer } from 'testcontainers';

const BRANCH_ID_1 = BranchId.from('11111111-1111-4111-8111-111111111111');
const BRANCH_ID_2 = BranchId.from('22222222-2222-4222-8222-222222222222');
const BAY_ID_1 = BayId.from('33333333-3333-4333-8333-333333333333');
const BRANCH_SCHEDULE_ID = ScheduleId.from('55555555-5555-4555-8555-555555555555');
const MASTER_SCHEDULE_ID = ScheduleId.from('66666666-6666-4666-8666-666666666666');
const UNAVAILABILITY_ID = UnavailabilityId.from('77777777-7777-4777-8777-777777777777');
const MASTER_ID = MasterId.from('88888888-8888-4888-8888-888888888888');
const MISSING_ID = BranchId.from('99999999-9999-4999-8999-999999999999');
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const CLIENT_ID = ClientId.from('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const VEHICLE_ID = VehicleId.from('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const SERVICE_ID = ServiceId.from('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const ACTOR_ID = UserId.from('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
const APPOINTMENT_ID_1 = AppointmentId.from('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
const APPOINTMENT_ID_2 = AppointmentId.from('abababab-abab-4aba-8aba-abababababab');
const APPOINTMENT_ID_3 = AppointmentId.from('12121212-1212-4212-8212-121212121212');
const APPOINTMENT_SERVICE_ID_1 = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const APPOINTMENT_SERVICE_ID_2 = '99999999-9999-4999-8999-999999999998';
const APPOINTMENT_SERVICE_ID_3 = '23232323-2323-4232-8232-232323232323';

function workingDay(openHour: number, closeHour: number): WorkingDay {
  return WorkingDay.from({
    close: TimeOfDay.from(closeHour, 0),
    open: TimeOfDay.from(openHour, 0),
  });
}

function weeklyPattern(openHour = 9, closeHour = 18): WeeklyPattern {
  const day = workingDay(openHour, closeHour);
  return new Map<DayOfWeek, WorkingDay | null>([
    [DayOfWeek.MONDAY, day],
    [DayOfWeek.TUESDAY, day],
    [DayOfWeek.WEDNESDAY, day],
    [DayOfWeek.THURSDAY, day],
    [DayOfWeek.FRIDAY, day],
    [DayOfWeek.SATURDAY, null],
    [DayOfWeek.SUNDAY, null],
  ]);
}

function masterPattern(openHour = 10, closeHour = 17): MasterWeeklyPattern {
  return weeklyPattern(openHour, closeHour);
}

function appointmentSlot(startIso: string, endIso: string): TimeSlot {
  return TimeSlot.from(
    DateTime.from(startIso),
    DateTime.from(endIso),
    Timezone.from('Europe/Moscow'),
  );
}

describe('SchedulingApplicationModule integration', () => {
  let container: StartedTestContainer;
  let client: Client;
  let moduleRef: TestingModule;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let idGen: QueueIdGenerator;
  let branchUsagePort: InMemoryBranchUsagePort;
  let bayUsagePort: InMemoryBayUsagePort;
  let iamUserPort: InMemoryIamUserPort;
  let appointmentRepo: PostgresAppointmentRepository;
  let catalogServicePort: InMemoryCatalogServicePort;
  let crmVehiclePort: InMemoryCrmVehiclePort;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withExposedPorts(5432)
      .withEnvironment({ POSTGRES_DB: 'test', POSTGRES_PASSWORD: 'test', POSTGRES_USER: 'test' })
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    client = new Client({
      database: 'test',
      host: container.getHost(),
      password: 'test',
      port: container.getMappedPort(5432),
      user: 'test',
    });
    await client.connect();
    await createSchedulingTestSchema(client);
  }, 60_000);

  afterAll(async () => {
    await client.end();
    await container.stop();
  });

  beforeEach(async () => {
    await truncateSchedulingTestSchema(client);

    idGen = new QueueIdGenerator();
    branchUsagePort = new InMemoryBranchUsagePort();
    bayUsagePort = new InMemoryBayUsagePort();
    iamUserPort = new InMemoryIamUserPort();

    const branchRepo = new PostgresBranchRepository(client);
    const bayRepo = new PostgresBayRepository(client);
    const branchScheduleRepo = new PostgresBranchScheduleRepository(client);
    const masterScheduleRepo = new PostgresMasterScheduleRepository(client);
    appointmentRepo = new PostgresAppointmentRepository(client);
    catalogServicePort = new InMemoryCatalogServicePort();
    crmVehiclePort = new InMemoryCrmVehiclePort();

    moduleRef = await Test.createTestingModule({
      imports: [
        SchedulingApplicationModule.register([
          { provide: BRANCH_REPOSITORY, useValue: branchRepo },
          { provide: BAY_REPOSITORY, useValue: bayRepo },
          { provide: APPOINTMENT_REPOSITORY, useValue: appointmentRepo },
          { provide: BRANCH_SCHEDULE_REPOSITORY, useValue: branchScheduleRepo },
          { provide: MASTER_SCHEDULE_REPOSITORY, useValue: masterScheduleRepo },
          { provide: BRANCH_READ_PORT, useValue: new PostgresBranchReadPort(client) },
          { provide: BAY_READ_PORT, useValue: new PostgresBayReadPort(client) },
          {
            provide: BRANCH_SCHEDULE_READ_PORT,
            useValue: new PostgresBranchScheduleReadPort(client),
          },
          {
            provide: MASTER_SCHEDULE_READ_PORT,
            useValue: new PostgresMasterScheduleReadPort(client),
          },
          { provide: BRANCH_USAGE_PORT, useValue: branchUsagePort },
          { provide: BAY_USAGE_PORT, useValue: bayUsagePort },
          { provide: IAM_USER_PORT, useValue: iamUserPort },
          { provide: CATALOG_SERVICE_PORT, useValue: catalogServicePort },
          { provide: CRM_VEHICLE_PORT, useValue: crmVehiclePort },
          { provide: CLOCK, useValue: new FixedClock(NOW) },
          { provide: ID_GENERATOR, useValue: idGen },
        ]),
      ],
    }).compile();
    await moduleRef.init();

    commandBus = moduleRef.get(CommandBus);
    queryBus = moduleRef.get(QueryBus);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  async function seedAppointmentPrerequisites(): Promise<void> {
    idGen.reset([BRANCH_ID_1, BAY_ID_1, BRANCH_SCHEDULE_ID, MASTER_SCHEDULE_ID]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));
    await commandBus.execute(new CreateBayCommand(BRANCH_ID_1, 'Бокс 1'));
    await commandBus.execute(new SetBranchScheduleCommand(BRANCH_ID_1, weeklyPattern()));
    await commandBus.execute(new SetMasterScheduleCommand(MASTER_ID, BRANCH_ID_1, masterPattern()));

    catalogServicePort.setService({
      durationMinutes: 60,
      id: SERVICE_ID,
      isActive: true,
      name: 'Полировка',
      pricing: { price: Money.rub('1500.00'), type: 'FIXED' },
    });
    crmVehiclePort.setVehicle({
      bodyType: 'SEDAN',
      clientId: CLIENT_ID,
      id: VEHICLE_ID,
      isActive: true,
    });
  }

  async function createAppointment(
    appointmentId: AppointmentId,
    appointmentServiceId: string,
    slot: TimeSlot,
  ): Promise<AppointmentCommandResult<{ id: AppointmentId }>> {
    idGen.reset([appointmentServiceId, appointmentId]);
    return commandBus.execute<
      CreateAppointmentCommand,
      AppointmentCommandResult<{ id: AppointmentId }>
    >(
      new CreateAppointmentCommand(
        CLIENT_ID,
        VEHICLE_ID,
        BRANCH_ID_1,
        MASTER_ID,
        [SERVICE_ID],
        slot,
        BAY_ID_1,
        ACTOR_ID,
        'ONLINE',
      ),
    );
  }

  it('creates, updates, deactivates and reactivates Branch', async () => {
    idGen.reset([BRANCH_ID_1]);

    const result = await commandBus.execute<CreateBranchCommand, { id: BranchId }>(
      new CreateBranchCommand('Центр', 'Москва, Тверская 1', 'Europe/Moscow'),
    );
    expect(result.id).toBe(BRANCH_ID_1);

    await commandBus.execute(new UpdateBranchCommand(BRANCH_ID_1, 'Центр Детейлинг', 'Москва'));
    await commandBus.execute(new DeactivateBranchCommand(BRANCH_ID_1));
    await commandBus.execute(
      new UpdateBranchCommand(BRANCH_ID_1, undefined, undefined, 'Europe/Samara'),
    );
    await commandBus.execute(new ReactivateBranchCommand(BRANCH_ID_1));

    const branch = await queryBus.execute<GetBranchByIdQuery, BranchDetailReadModel>(
      new GetBranchByIdQuery(BRANCH_ID_1),
    );
    expect(branch).toMatchObject({
      address: 'Москва',
      id: BRANCH_ID_1,
      isActive: true,
      name: 'Центр Детейлинг',
      timezone: 'Europe/Samara',
    });
    const events = await outboxEventTypes(client);
    expect(events).toHaveLength(6);
    expect(events).toEqual(
      expect.arrayContaining([
        'BranchCreated',
        'BranchRenamed',
        'BranchAddressUpdated',
        'BranchDeactivated',
        'BranchTimezoneChanged',
        'BranchReactivated',
      ]),
    );
  });

  it('rejects Branch commands for missing, active and used branches', async () => {
    await expect(
      commandBus.execute(new UpdateBranchCommand(MISSING_ID, 'Нет')),
    ).rejects.toBeInstanceOf(BranchNotFoundError);

    idGen.reset([BRANCH_ID_1]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));

    await expect(
      commandBus.execute(
        new UpdateBranchCommand(BRANCH_ID_1, undefined, undefined, 'Europe/Samara'),
      ),
    ).rejects.toBeInstanceOf(BranchInUseError);
    await expect(
      commandBus.execute(new ReactivateBranchCommand(BRANCH_ID_1)),
    ).rejects.toBeInstanceOf(BranchAlreadyActiveError);

    branchUsagePort.setHasActiveAppointments(BRANCH_ID_1, true);
    await expect(
      commandBus.execute(new DeactivateBranchCommand(BRANCH_ID_1)),
    ).rejects.toBeInstanceOf(BranchInUseError);

    branchUsagePort.setHasActiveAppointments(BRANCH_ID_1, false);
    await commandBus.execute(new DeactivateBranchCommand(BRANCH_ID_1));
    await expect(
      commandBus.execute(new DeactivateBranchCommand(BRANCH_ID_1)),
    ).rejects.toBeInstanceOf(BranchAlreadyDeactivatedError);
  });

  it('creates, updates, lists and deactivates Bay', async () => {
    idGen.reset([BRANCH_ID_1, BAY_ID_1]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));

    const result = await commandBus.execute<CreateBayCommand, { id: BayId }>(
      new CreateBayCommand(BRANCH_ID_1, 'Бокс 1'),
    );
    expect(result.id).toBe(BAY_ID_1);

    await commandBus.execute(new UpdateBayCommand(BAY_ID_1, 'Бокс A'));
    await commandBus.execute(new DeactivateBayCommand(BAY_ID_1));

    const bays = await queryBus.execute<ListBaysByBranchQuery, readonly BayReadModel[]>(
      new ListBaysByBranchQuery(BRANCH_ID_1),
    );
    expect(bays).toEqual([
      { branchId: BRANCH_ID_1, id: BAY_ID_1, isActive: false, name: 'Бокс A' },
    ]);
    expect(await outboxEventTypes(client)).toContain('BayDeactivated');
  });

  it('rejects Bay commands for missing Branch, missing Bay, used Bay and already deactivated Bay', async () => {
    idGen.reset([BAY_ID_1]);
    await expect(
      commandBus.execute(new CreateBayCommand(MISSING_ID, 'Бокс')),
    ).rejects.toBeInstanceOf(BranchNotFoundError);
    await expect(commandBus.execute(new UpdateBayCommand(BAY_ID_1, 'Нет'))).rejects.toBeInstanceOf(
      BayNotFoundError,
    );

    idGen.reset([BRANCH_ID_1, BAY_ID_1]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));
    await commandBus.execute(new CreateBayCommand(BRANCH_ID_1, 'Бокс'));

    bayUsagePort.setHasFutureAppointments(BAY_ID_1, true);
    await expect(commandBus.execute(new DeactivateBayCommand(BAY_ID_1))).rejects.toBeInstanceOf(
      BayInUseError,
    );

    bayUsagePort.setHasFutureAppointments(BAY_ID_1, false);
    await commandBus.execute(new DeactivateBayCommand(BAY_ID_1));
    await expect(commandBus.execute(new DeactivateBayCommand(BAY_ID_1))).rejects.toBeInstanceOf(
      BayAlreadyDeactivatedError,
    );
  });

  it('sets BranchSchedule and manages exceptions', async () => {
    idGen.reset([BRANCH_ID_1, BRANCH_SCHEDULE_ID]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));

    const result = await commandBus.execute<SetBranchScheduleCommand, { id: ScheduleId }>(
      new SetBranchScheduleCommand(BRANCH_ID_1, weeklyPattern()),
    );
    expect(result.id).toBe(BRANCH_SCHEDULE_ID);

    await commandBus.execute(
      new AddBranchScheduleExceptionCommand(
        BRANCH_ID_1,
        ScheduleException.from({ date: '2026-01-02', isClosed: true, reason: 'Праздник' }),
      ),
    );

    let schedule = await queryBus.execute<GetBranchScheduleQuery, BranchScheduleReadModel>(
      new GetBranchScheduleQuery(BRANCH_ID_1),
    );
    expect(schedule.exceptions).toEqual([
      { customRange: null, date: '2026-01-02', isClosed: true, reason: 'Праздник' },
    ]);

    await commandBus.execute(new RemoveBranchScheduleExceptionCommand(BRANCH_ID_1, '2026-01-02'));
    schedule = await queryBus.execute(new GetBranchScheduleQuery(BRANCH_ID_1));
    expect(schedule.exceptions).toEqual([]);
  });

  it('rejects BranchSchedule commands for missing Branch or Schedule', async () => {
    await expect(
      commandBus.execute(new SetBranchScheduleCommand(MISSING_ID, weeklyPattern())),
    ).rejects.toBeInstanceOf(BranchNotFoundError);
    await expect(
      commandBus.execute(
        new AddBranchScheduleExceptionCommand(
          MISSING_ID,
          ScheduleException.from({ date: '2026-01-02', isClosed: true }),
        ),
      ),
    ).rejects.toBeInstanceOf(BranchScheduleNotFoundError);
  });

  it('sets MasterSchedule and manages unavailability', async () => {
    idGen.reset([BRANCH_ID_1, BRANCH_SCHEDULE_ID, MASTER_SCHEDULE_ID, UNAVAILABILITY_ID]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));
    await commandBus.execute(new SetBranchScheduleCommand(BRANCH_ID_1, weeklyPattern()));

    const result = await commandBus.execute<SetMasterScheduleCommand, { id: ScheduleId }>(
      new SetMasterScheduleCommand(MASTER_ID, BRANCH_ID_1, masterPattern()),
    );
    expect(result.id).toBe(MASTER_SCHEDULE_ID);

    const fromAt = DateTime.from('2026-01-05T09:00:00.000Z');
    const toAt = DateTime.from('2026-01-05T10:00:00.000Z');
    const unavailability = await commandBus.execute<
      AddMasterUnavailabilityCommand,
      { id: UnavailabilityId }
    >(new AddMasterUnavailabilityCommand(MASTER_ID, BRANCH_ID_1, fromAt, toAt, 'Отпуск'));
    expect(unavailability.id).toBe(UNAVAILABILITY_ID);

    let schedule = await queryBus.execute<GetMasterScheduleQuery, MasterScheduleReadModel>(
      new GetMasterScheduleQuery(MASTER_ID, BRANCH_ID_1),
    );
    expect(schedule.unavailabilities).toEqual([
      {
        fromAt: '2026-01-05T09:00:00.000Z',
        id: UNAVAILABILITY_ID,
        reason: 'Отпуск',
        toAt: '2026-01-05T10:00:00.000Z',
      },
    ]);

    await commandBus.execute(
      new RemoveMasterUnavailabilityCommand(MASTER_ID, BRANCH_ID_1, UNAVAILABILITY_ID),
    );
    schedule = await queryBus.execute(new GetMasterScheduleQuery(MASTER_ID, BRANCH_ID_1));
    expect(schedule.unavailabilities).toEqual([]);
  });

  it('rejects MasterSchedule outside Branch hours and missing schedules', async () => {
    idGen.reset([BRANCH_ID_1, BRANCH_SCHEDULE_ID]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));
    await commandBus.execute(new SetBranchScheduleCommand(BRANCH_ID_1, weeklyPattern(9, 18)));

    await expect(
      commandBus.execute(
        new SetMasterScheduleCommand(MASTER_ID, BRANCH_ID_1, masterPattern(8, 17)),
      ),
    ).rejects.toBeInstanceOf(MasterScheduleOutsideBranchHoursError);
    await expect(
      commandBus.execute(
        new AddMasterUnavailabilityCommand(
          MASTER_ID,
          BRANCH_ID_1,
          DateTime.from('2026-01-05T09:00:00.000Z'),
          DateTime.from('2026-01-05T10:00:00.000Z'),
          'Нет графика',
        ),
      ),
    ).rejects.toBeInstanceOf(MasterScheduleNotFoundError);
  });

  it('creates and reschedules Appointment', async () => {
    await seedAppointmentPrerequisites();

    const createResult = await createAppointment(
      APPOINTMENT_ID_1,
      APPOINTMENT_SERVICE_ID_1,
      appointmentSlot('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z'),
    );
    expect(createResult).toEqual({ ok: true, value: { id: APPOINTMENT_ID_1 } });

    const rescheduleResult = await commandBus.execute<
      RescheduleAppointmentCommand,
      AppointmentCommandResult<null>
    >(
      new RescheduleAppointmentCommand(
        APPOINTMENT_ID_1,
        BRANCH_ID_1,
        MASTER_ID,
        appointmentSlot('2026-01-05T11:00:00.000Z', '2026-01-05T12:00:00.000Z'),
        BAY_ID_1,
        ACTOR_ID,
        'MANAGER',
      ),
    );
    expect(rescheduleResult).toEqual({ ok: true, value: null });

    const appointment = await appointmentRepo.findById(APPOINTMENT_ID_1);
    if (appointment === null) {
      throw new Error('Appointment was not persisted');
    }
    expect(appointment.toSnapshot()).toMatchObject({
      id: APPOINTMENT_ID_1,
      slotEnd: '2026-01-05T12:00:00.000Z',
      slotStart: '2026-01-05T11:00:00.000Z',
    });
    expect(await outboxEventTypes(client)).toEqual(
      expect.arrayContaining(['AppointmentCreated', 'AppointmentRescheduled']),
    );
  });

  it('rejects Appointment creation for inactive Service', async () => {
    await seedAppointmentPrerequisites();
    catalogServicePort.setService({
      durationMinutes: 60,
      id: SERVICE_ID,
      isActive: false,
      name: 'Полировка',
      pricing: { price: Money.rub('1500.00'), type: 'FIXED' },
    });

    const result = await createAppointment(
      APPOINTMENT_ID_1,
      APPOINTMENT_SERVICE_ID_1,
      appointmentSlot('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z'),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ServiceInactiveError);
    }
  });

  it('rejects Appointment creation for occupied Slot', async () => {
    await seedAppointmentPrerequisites();

    const slot = appointmentSlot('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z');
    const firstResult = await createAppointment(APPOINTMENT_ID_1, APPOINTMENT_SERVICE_ID_1, slot);
    expect(firstResult.ok).toBe(true);

    const secondResult = await createAppointment(APPOINTMENT_ID_2, APPOINTMENT_SERVICE_ID_2, slot);

    expect(secondResult.ok).toBe(false);
    if (!secondResult.ok) {
      expect(secondResult.error).toBeInstanceOf(SlotConflictError);
    }
  });

  it('retries Appointment creation after optimistic lock failures', async () => {
    await seedAppointmentPrerequisites();
    appointmentRepo.failNextSavesWithOptimisticLock(2);
    idGen.reset([
      APPOINTMENT_SERVICE_ID_1,
      APPOINTMENT_ID_1,
      APPOINTMENT_SERVICE_ID_2,
      APPOINTMENT_ID_2,
      APPOINTMENT_SERVICE_ID_3,
      APPOINTMENT_ID_3,
    ]);

    const result = await commandBus.execute<
      CreateAppointmentCommand,
      AppointmentCommandResult<{ id: AppointmentId }>
    >(
      new CreateAppointmentCommand(
        CLIENT_ID,
        VEHICLE_ID,
        BRANCH_ID_1,
        MASTER_ID,
        [SERVICE_ID],
        appointmentSlot('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z'),
        BAY_ID_1,
        ACTOR_ID,
        'ONLINE',
      ),
    );

    expect(result).toEqual({ ok: true, value: { id: APPOINTMENT_ID_3 } });
  });

  it('returns branches with pagination, details and ListMastersByBranch IAM enrichment', async () => {
    idGen.reset([BRANCH_ID_2, BRANCH_ID_1, BRANCH_SCHEDULE_ID, MASTER_SCHEDULE_ID]);
    await commandBus.execute(new CreateBranchCommand('Юг', 'Адрес 2', 'Europe/Moscow'));
    await commandBus.execute(new CreateBranchCommand('Центр', 'Адрес 1', 'Europe/Moscow'));
    await commandBus.execute(new SetBranchScheduleCommand(BRANCH_ID_1, weeklyPattern()));
    await commandBus.execute(new SetMasterScheduleCommand(MASTER_ID, BRANCH_ID_1, masterPattern()));
    iamUserPort.setUser({ fullName: 'Иван Мастер', id: MASTER_ID });

    const branches = await queryBus.execute<
      ListBranchesQuery,
      PaginatedResult<BranchDetailReadModel>
    >(new ListBranchesQuery(true, 1, 1));
    expect(branches.total).toBe(2);
    expect(branches.items).toHaveLength(1);

    const branch = await queryBus.execute<GetBranchByIdQuery, BranchDetailReadModel>(
      new GetBranchByIdQuery(BRANCH_ID_1),
    );
    expect(branch.schedule?.id).toBe(BRANCH_SCHEDULE_ID);

    const masters = await queryBus.execute<ListMastersByBranchQuery, readonly MasterReadModel[]>(
      new ListMastersByBranchQuery(BRANCH_ID_1),
    );
    expect(masters).toEqual([
      {
        fullName: 'Иван Мастер',
        masterId: MASTER_ID,
        schedule: expect.objectContaining({ id: MASTER_SCHEDULE_ID, masterId: MASTER_ID }),
      },
    ]);
  });

  it('rejects queries for missing records and missing IAM metadata', async () => {
    await expect(queryBus.execute(new GetBranchByIdQuery(MISSING_ID))).rejects.toBeInstanceOf(
      BranchNotFoundError,
    );
    await expect(queryBus.execute(new GetBranchScheduleQuery(MISSING_ID))).rejects.toBeInstanceOf(
      BranchScheduleNotFoundError,
    );
    await expect(
      queryBus.execute(new GetMasterScheduleQuery(MASTER_ID, MISSING_ID)),
    ).rejects.toBeInstanceOf(MasterScheduleNotFoundError);

    idGen.reset([BRANCH_ID_1, BRANCH_SCHEDULE_ID, MASTER_SCHEDULE_ID]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));
    await commandBus.execute(new SetBranchScheduleCommand(BRANCH_ID_1, weeklyPattern()));
    await commandBus.execute(new SetMasterScheduleCommand(MASTER_ID, BRANCH_ID_1, masterPattern()));

    await expect(
      queryBus.execute(new ListMastersByBranchQuery(BRANCH_ID_1)),
    ).rejects.toBeInstanceOf(IamUserNotFoundError);
  });

  it('supports custom BranchSchedule exception range', async () => {
    idGen.reset([BRANCH_ID_1, BRANCH_SCHEDULE_ID]);
    await commandBus.execute(new CreateBranchCommand('Центр', 'Москва', 'Europe/Moscow'));
    await commandBus.execute(new SetBranchScheduleCommand(BRANCH_ID_1, weeklyPattern()));
    await commandBus.execute(
      new AddBranchScheduleExceptionCommand(
        BRANCH_ID_1,
        ScheduleException.from({
          customRange: TimeRange.from(TimeOfDay.from(11, 0), TimeOfDay.from(15, 0)),
          date: '2026-01-03',
          isClosed: false,
          reason: 'Сокращённый день',
        }),
      ),
    );

    const schedule = await queryBus.execute<GetBranchScheduleQuery, BranchScheduleReadModel>(
      new GetBranchScheduleQuery(BRANCH_ID_1),
    );
    expect(schedule.exceptions).toEqual([
      {
        customRange: { end: '15:00', start: '11:00' },
        date: '2026-01-03',
        isClosed: false,
        reason: 'Сокращённый день',
      },
    ]);
  });
});
