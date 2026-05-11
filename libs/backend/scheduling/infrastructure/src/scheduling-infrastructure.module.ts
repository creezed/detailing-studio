import { Module, type OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import {
  SCHEDULING_APPOINTMENT_PORT,
  WorkOrderClosedIntegrationEvent,
} from '@det/backend-scheduling-application';
import {
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
} from '@det/backend-scheduling-domain';
import { EventTypeRegistry, OutboxModule } from '@det/backend-shared-outbox';

import { SchedulingAppointmentPortAdapter } from './acl/scheduling-appointment-port.adapter';

@Module({
  exports: [SCHEDULING_APPOINTMENT_PORT],
  imports: [CqrsModule, OutboxModule],
  providers: [
    SchedulingAppointmentPortAdapter,
    {
      provide: SCHEDULING_APPOINTMENT_PORT,
      useExisting: SchedulingAppointmentPortAdapter,
    },
  ],
})
export class SchedulingInfrastructureModule implements OnModuleInit {
  constructor(private readonly eventRegistry: EventTypeRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register([
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
