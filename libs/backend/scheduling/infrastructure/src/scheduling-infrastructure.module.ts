import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, type OnModuleInit, type Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import {
  APPOINTMENT_READ_PORT,
  APPOINTMENT_REPOSITORY,
  BAY_READ_PORT,
  BAY_REPOSITORY,
  BAY_USAGE_PORT,
  BRANCH_READ_PORT,
  BRANCH_REPOSITORY,
  BRANCH_SCHEDULE_READ_PORT,
  BRANCH_SCHEDULE_REPOSITORY,
  BRANCH_USAGE_PORT,
  CLOCK,
  ID_GENERATOR,
  MASTER_SCHEDULE_READ_PORT,
  MASTER_SCHEDULE_REPOSITORY,
  SCHEDULING_APPOINTMENT_PORT,
  WorkOrderClosedIntegrationEvent,
} from '@det/backend-scheduling-application';
import {
  BayCreated,
  BayDeactivated,
  BayReactivated,
  BayRenamed,
  BranchAddressUpdated,
  BranchCreated,
  BranchDeactivated,
  BranchReactivated,
  BranchRenamed,
  BranchScheduleExceptionAdded,
  BranchScheduleExceptionRemoved,
  BranchScheduleSet,
  BranchTimezoneChanged,
  AppointmentCancellationApproved,
  AppointmentCancellationRejected,
  AppointmentCancellationRequested,
  AppointmentCancelled,
  AppointmentCompleted,
  AppointmentConfirmed,
  AppointmentCreated,
  AppointmentMarkedNoShow,
  AppointmentRescheduled,
  AppointmentStarted,
  MasterScheduleCreated,
  MasterScheduleUpdated,
  MasterUnavailabilityAdded,
  MasterUnavailabilityRemoved,
} from '@det/backend-scheduling-domain';
import { EventTypeRegistry, OutboxModule } from '@det/backend-shared-outbox';

import { SchedulingAppointmentPortAdapter } from './acl/scheduling-appointment-port.adapter';
import { CryptoIdGeneratorAdapter } from './adapters/crypto-id-generator.adapter';
import { BayUsageAdapter, BranchUsageAdapter } from './adapters/scheduling-usage.adapter';
import { SystemClockAdapter } from './adapters/system-clock.adapter';
import { AppointmentServiceSchema } from './persistence/appointment-service.schema';
import { AppointmentSchema } from './persistence/appointment.schema';
import { BaySchema } from './persistence/bay.schema';
import { BranchScheduleExceptionSchema } from './persistence/branch-schedule-exception.schema';
import { BranchScheduleSchema } from './persistence/branch-schedule.schema';
import { BranchSchema } from './persistence/branch.schema';
import { MasterScheduleSchema } from './persistence/master-schedule.schema';
import { MasterUnavailabilitySchema } from './persistence/master-unavailability.schema';
import { BayReadAdapter } from './read-models/bay-read.adapter';
import { BranchReadAdapter } from './read-models/branch-read.adapter';
import { BranchScheduleReadAdapter } from './read-models/branch-schedule-read.adapter';
import { MasterScheduleReadAdapter } from './read-models/master-schedule-read.adapter';
import { AppointmentReadAdapter } from './read-models/scheduling-read.adapter';
import { AppointmentRepository } from './repositories/appointment.repository';
import { BayRepository } from './repositories/bay.repository';
import { BranchScheduleRepository } from './repositories/branch-schedule.repository';
import { BranchRepository } from './repositories/branch.repository';
import { MasterScheduleRepository } from './repositories/master-schedule.repository';

const SCHEDULING_SCHEMAS = [
  BranchSchema,
  BaySchema,
  BranchScheduleSchema,
  BranchScheduleExceptionSchema,
  MasterScheduleSchema,
  MasterUnavailabilitySchema,
  AppointmentSchema,
  AppointmentServiceSchema,
];

const INFRASTRUCTURE_PROVIDERS: readonly Provider[] = [
  AppointmentReadAdapter,
  AppointmentRepository,
  BayReadAdapter,
  BayRepository,
  BayUsageAdapter,
  BranchReadAdapter,
  BranchRepository,
  BranchScheduleReadAdapter,
  BranchScheduleRepository,
  BranchUsageAdapter,
  CryptoIdGeneratorAdapter,
  MasterScheduleReadAdapter,
  MasterScheduleRepository,
  SchedulingAppointmentPortAdapter,
  SystemClockAdapter,
  {
    provide: APPOINTMENT_READ_PORT,
    useExisting: AppointmentReadAdapter,
  },
  {
    provide: APPOINTMENT_REPOSITORY,
    useExisting: AppointmentRepository,
  },
  {
    provide: BAY_READ_PORT,
    useExisting: BayReadAdapter,
  },
  {
    provide: BAY_REPOSITORY,
    useExisting: BayRepository,
  },
  {
    provide: BAY_USAGE_PORT,
    useExisting: BayUsageAdapter,
  },
  {
    provide: BRANCH_READ_PORT,
    useExisting: BranchReadAdapter,
  },
  {
    provide: BRANCH_REPOSITORY,
    useExisting: BranchRepository,
  },
  {
    provide: BRANCH_SCHEDULE_READ_PORT,
    useExisting: BranchScheduleReadAdapter,
  },
  {
    provide: BRANCH_SCHEDULE_REPOSITORY,
    useExisting: BranchScheduleRepository,
  },
  {
    provide: BRANCH_USAGE_PORT,
    useExisting: BranchUsageAdapter,
  },
  {
    provide: CLOCK,
    useExisting: SystemClockAdapter,
  },
  {
    provide: ID_GENERATOR,
    useExisting: CryptoIdGeneratorAdapter,
  },
  {
    provide: MASTER_SCHEDULE_READ_PORT,
    useExisting: MasterScheduleReadAdapter,
  },
  {
    provide: MASTER_SCHEDULE_REPOSITORY,
    useExisting: MasterScheduleRepository,
  },
  {
    provide: SCHEDULING_APPOINTMENT_PORT,
    useExisting: SchedulingAppointmentPortAdapter,
  },
];

@Module({
  exports: [
    APPOINTMENT_READ_PORT,
    APPOINTMENT_REPOSITORY,
    BAY_READ_PORT,
    BAY_REPOSITORY,
    BAY_USAGE_PORT,
    BRANCH_READ_PORT,
    BRANCH_REPOSITORY,
    BRANCH_SCHEDULE_READ_PORT,
    BRANCH_SCHEDULE_REPOSITORY,
    BRANCH_USAGE_PORT,
    CLOCK,
    ID_GENERATOR,
    MASTER_SCHEDULE_READ_PORT,
    MASTER_SCHEDULE_REPOSITORY,
    SCHEDULING_APPOINTMENT_PORT,
  ],
  imports: [CqrsModule, MikroOrmModule.forFeature(SCHEDULING_SCHEMAS), OutboxModule],
  providers: [...INFRASTRUCTURE_PROVIDERS],
})
export class SchedulingInfrastructureModule implements OnModuleInit {
  constructor(private readonly eventRegistry: EventTypeRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register([
      { ctor: BranchCreated, eventType: 'BranchCreated' },
      { ctor: BranchRenamed, eventType: 'BranchRenamed' },
      { ctor: BranchAddressUpdated, eventType: 'BranchAddressUpdated' },
      { ctor: BranchTimezoneChanged, eventType: 'BranchTimezoneChanged' },
      { ctor: BranchDeactivated, eventType: 'BranchDeactivated' },
      { ctor: BranchReactivated, eventType: 'BranchReactivated' },
      { ctor: BayCreated, eventType: 'BayCreated' },
      { ctor: BayRenamed, eventType: 'BayRenamed' },
      { ctor: BayDeactivated, eventType: 'BayDeactivated' },
      { ctor: BayReactivated, eventType: 'BayReactivated' },
      { ctor: BranchScheduleSet, eventType: 'BranchScheduleSet' },
      { ctor: BranchScheduleExceptionAdded, eventType: 'BranchScheduleExceptionAdded' },
      { ctor: BranchScheduleExceptionRemoved, eventType: 'BranchScheduleExceptionRemoved' },
      { ctor: MasterScheduleCreated, eventType: 'MasterScheduleCreated' },
      { ctor: MasterScheduleUpdated, eventType: 'MasterScheduleUpdated' },
      { ctor: MasterUnavailabilityAdded, eventType: 'MasterUnavailabilityAdded' },
      { ctor: MasterUnavailabilityRemoved, eventType: 'MasterUnavailabilityRemoved' },
      { ctor: AppointmentCreated, eventType: 'AppointmentCreated' },
      { ctor: AppointmentConfirmed, eventType: 'AppointmentConfirmed' },
      { ctor: AppointmentRescheduled, eventType: 'AppointmentRescheduled' },
      { ctor: AppointmentCancelled, eventType: 'AppointmentCancelled' },
      { ctor: AppointmentCancellationRequested, eventType: 'AppointmentCancellationRequested' },
      { ctor: AppointmentCancellationApproved, eventType: 'AppointmentCancellationApproved' },
      { ctor: AppointmentCancellationRejected, eventType: 'AppointmentCancellationRejected' },
      { ctor: AppointmentStarted, eventType: 'AppointmentStarted' },
      { ctor: AppointmentCompleted, eventType: 'AppointmentCompleted' },
      { ctor: AppointmentMarkedNoShow, eventType: 'AppointmentMarkedNoShow' },
      { ctor: WorkOrderClosedIntegrationEvent, eventType: 'WorkOrderClosed' },
    ]);
  }
}
