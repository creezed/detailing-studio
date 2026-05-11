import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AddBranchScheduleExceptionHandler } from './commands/add-branch-schedule-exception/add-branch-schedule-exception.handler';
import { AddMasterUnavailabilityHandler } from './commands/add-master-unavailability/add-master-unavailability.handler';
import { CompleteAppointmentHandler } from './commands/complete-appointment/complete-appointment.handler';
import { CreateAppointmentHandler } from './commands/create-appointment/create-appointment.handler';
import { CreateBayHandler } from './commands/create-bay/create-bay.handler';
import { CreateBranchHandler } from './commands/create-branch/create-branch.handler';
import { DeactivateBayHandler } from './commands/deactivate-bay/deactivate-bay.handler';
import { DeactivateBranchHandler } from './commands/deactivate-branch/deactivate-branch.handler';
import { ReactivateBranchHandler } from './commands/reactivate-branch/reactivate-branch.handler';
import { RemoveBranchScheduleExceptionHandler } from './commands/remove-branch-schedule-exception/remove-branch-schedule-exception.handler';
import { RemoveMasterUnavailabilityHandler } from './commands/remove-master-unavailability/remove-master-unavailability.handler';
import { RescheduleAppointmentHandler } from './commands/reschedule-appointment/reschedule-appointment.handler';
import { SetBranchScheduleHandler } from './commands/set-branch-schedule/set-branch-schedule.handler';
import { SetMasterScheduleHandler } from './commands/set-master-schedule/set-master-schedule.handler';
import { StartWorkHandler } from './commands/start-work/start-work.handler';
import { UpdateBayHandler } from './commands/update-bay/update-bay.handler';
import { UpdateBranchHandler } from './commands/update-branch/update-branch.handler';
import { GetAppointmentByIdHandler } from './queries/get-appointment-by-id/get-appointment-by-id.handler';
import { GetAvailableSlotsHandler } from './queries/get-available-slots/get-available-slots.handler';
import { GetBranchByIdHandler } from './queries/get-branch-by-id/get-branch-by-id.handler';
import { GetBranchScheduleHandler } from './queries/get-branch-schedule/get-branch-schedule.handler';
import { GetMasterScheduleHandler } from './queries/get-master-schedule/get-master-schedule.handler';
import { GetTodayAppointmentsForMasterHandler } from './queries/get-today-appointments-for-master/get-today-appointments-for-master.handler';
import { ListAppointmentsHandler } from './queries/list-appointments/list-appointments.handler';
import { ListBaysByBranchHandler } from './queries/list-bays-by-branch/list-bays-by-branch.handler';
import { ListBranchesHandler } from './queries/list-branches/list-branches.handler';
import { ListMastersByBranchHandler } from './queries/list-masters-by-branch/list-masters-by-branch.handler';
import { ApplyStartWorkSaga } from './sagas/apply-start-work.saga';
import { CloseAppointmentOnWorkOrderClosedSaga } from './sagas/close-appointment-on-work-order-closed.saga';
import { AppointmentHotPathService } from './services/appointment-hot-path.service';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  CreateBranchHandler,
  UpdateBranchHandler,
  DeactivateBranchHandler,
  ReactivateBranchHandler,
  CreateBayHandler,
  UpdateBayHandler,
  DeactivateBayHandler,
  SetBranchScheduleHandler,
  AddBranchScheduleExceptionHandler,
  RemoveBranchScheduleExceptionHandler,
  SetMasterScheduleHandler,
  AddMasterUnavailabilityHandler,
  RemoveMasterUnavailabilityHandler,
  CreateAppointmentHandler,
  RescheduleAppointmentHandler,
  StartWorkHandler,
  CompleteAppointmentHandler,
];

const QUERY_HANDLERS = [
  ListBranchesHandler,
  GetBranchByIdHandler,
  GetBranchScheduleHandler,
  ListBaysByBranchHandler,
  GetMasterScheduleHandler,
  ListMastersByBranchHandler,
  ListAppointmentsHandler,
  GetAppointmentByIdHandler,
  GetAvailableSlotsHandler,
  GetTodayAppointmentsForMasterHandler,
];

const EVENT_HANDLERS = [ApplyStartWorkSaga, CloseAppointmentOnWorkOrderClosedSaga];

@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class SchedulingApplicationModule {
  static register(
    providers: readonly Provider[],
    imports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    return {
      exports: [CqrsModule, ...providers],
      imports: [CqrsModule, ...imports],
      module: SchedulingApplicationModule,
      providers: [
        ...providers,
        AppointmentHotPathService,
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
        ...EVENT_HANDLERS,
      ],
    };
  }
}
