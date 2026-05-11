export { SchedulingApplicationModule } from './scheduling-application.module';

export { AddBranchScheduleExceptionCommand } from './commands/add-branch-schedule-exception/add-branch-schedule-exception.command';
export { AddMasterUnavailabilityCommand } from './commands/add-master-unavailability/add-master-unavailability.command';
export { CompleteAppointmentCommand } from './commands/complete-appointment/complete-appointment.command';
export { CreateAppointmentCommand } from './commands/create-appointment/create-appointment.command';
export type { AppointmentCreationChannel } from './commands/create-appointment/create-appointment.command';
export { CreateBayCommand } from './commands/create-bay/create-bay.command';
export { CreateBranchCommand } from './commands/create-branch/create-branch.command';
export { DeactivateBayCommand } from './commands/deactivate-bay/deactivate-bay.command';
export { DeactivateBranchCommand } from './commands/deactivate-branch/deactivate-branch.command';
export { ReactivateBranchCommand } from './commands/reactivate-branch/reactivate-branch.command';
export { RemoveBranchScheduleExceptionCommand } from './commands/remove-branch-schedule-exception/remove-branch-schedule-exception.command';
export { RemoveMasterUnavailabilityCommand } from './commands/remove-master-unavailability/remove-master-unavailability.command';
export { RescheduleAppointmentCommand } from './commands/reschedule-appointment/reschedule-appointment.command';
export type { RescheduleAppointmentActorRole } from './commands/reschedule-appointment/reschedule-appointment.command';
export { SetBranchScheduleCommand } from './commands/set-branch-schedule/set-branch-schedule.command';
export { SetMasterScheduleCommand } from './commands/set-master-schedule/set-master-schedule.command';
export { StartWorkCommand } from './commands/start-work/start-work.command';
export { UpdateBayCommand } from './commands/update-bay/update-bay.command';
export { UpdateBranchCommand } from './commands/update-branch/update-branch.command';

export { GetAppointmentByIdQuery } from './queries/get-appointment-by-id/get-appointment-by-id.query';
export { GetAvailableSlotsQuery } from './queries/get-available-slots/get-available-slots.query';
export type { GetAvailableSlotsQueryProps } from './queries/get-available-slots/get-available-slots.query';
export { GetBranchByIdQuery } from './queries/get-branch-by-id/get-branch-by-id.query';
export { GetBranchScheduleQuery } from './queries/get-branch-schedule/get-branch-schedule.query';
export { GetMasterScheduleQuery } from './queries/get-master-schedule/get-master-schedule.query';
export { GetTodayAppointmentsForMasterQuery } from './queries/get-today-appointments-for-master/get-today-appointments-for-master.query';
export { ListAppointmentsQuery } from './queries/list-appointments/list-appointments.query';
export type { ListAppointmentsQueryFilter } from './queries/list-appointments/list-appointments.query';
export { ListBaysByBranchQuery } from './queries/list-bays-by-branch/list-bays-by-branch.query';
export { ListBranchesQuery } from './queries/list-branches/list-branches.query';
export { ListMastersByBranchQuery } from './queries/list-masters-by-branch/list-masters-by-branch.query';

export {
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
  CATALOG_SERVICE_PORT,
  CLOCK,
  CRM_VEHICLE_PORT,
  IAM_USER_PORT,
  ID_GENERATOR,
  MASTER_SCHEDULE_READ_PORT,
  MASTER_SCHEDULE_REPOSITORY,
  SCHEDULING_APPOINTMENT_PORT,
  WORK_ORDER_PORT,
} from './di/tokens';
export * from './errors/application.errors';
export type { IBayReadPort } from './ports/bay-read.port';
export type { IBayUsagePort } from './ports/bay-usage.port';
export type { IBranchReadPort, ListBranchesFilter } from './ports/branch-read.port';
export type { IBranchScheduleReadPort } from './ports/branch-schedule-read.port';
export type { IBranchUsagePort } from './ports/branch-usage.port';
export type { IAppointmentReadPort, ListAppointmentsFilter } from './ports/appointment-read.port';
export type {
  CatalogServicePricingReadModel,
  CatalogServiceReadModel,
  ICatalogServicePort,
} from './ports/catalog-service.port';
export type {
  CrmVehicleReadModel,
  ICrmVehiclePort,
  VehicleBodyType,
} from './ports/crm-vehicle.port';
export type { IIamUserPort, IamUserReadModel } from './ports/iam-user.port';
export type { IMasterScheduleReadPort } from './ports/master-schedule-read.port';
export type { ISchedulingAppointmentPort } from './ports/scheduling-appointment.port';
export type {
  IWorkOrderPort,
  OpenWorkOrderFromAppointmentSnapshot,
  WorkOrderAppointmentServiceSnapshot,
} from './ports/work-order.port';
export * from './read-models/scheduling.read-models';
export { WorkOrderClosedIntegrationEvent } from './sagas/work-order-closed.event';

export {
  AppointmentId,
  AppointmentServiceId,
  AppointmentStatus,
  BayId,
  BranchId,
  CreationChannel,
  DayOfWeek,
  Duration,
  MasterId,
  ScheduleException,
  ScheduleId,
  TimeSlot,
  TimeOfDay,
  TimeRange,
  UnavailabilityId,
  WorkingDay,
} from '@det/backend-scheduling-domain';
export type { AppointmentCommandResult } from './services/appointment-command-result';
export type {
  AppointmentService,
  IAppointmentRepository,
  IBayRepository,
  IBranchRepository,
  IBranchScheduleRepository,
  IMasterScheduleRepository,
  MasterWeeklyPattern,
  WeeklyPattern,
} from '@det/backend-scheduling-domain';
