export { OpenWorkOrderCommand } from './commands/open-work-order/open-work-order.command';
export { AddPhotoCommand } from './commands/add-photo/add-photo.command';
export { RemovePhotoCommand } from './commands/remove-photo/remove-photo.command';
export { AddConsumptionCommand } from './commands/add-consumption/add-consumption.command';
export { UpdateConsumptionLineCommand } from './commands/update-consumption-line/update-consumption-line.command';
export { RemoveConsumptionLineCommand } from './commands/remove-consumption-line/remove-consumption-line.command';
export { SubmitForReviewCommand } from './commands/submit-for-review/submit-for-review.command';
export { ReturnToInProgressCommand } from './commands/return-to-in-progress/return-to-in-progress.command';
export { CancelWorkOrderCommand } from './commands/cancel-work-order/cancel-work-order.command';
export { CloseWorkOrderCommand } from './commands/close-work-order/close-work-order.command';

export { ListWorkOrdersQuery } from './queries/list-work-orders/list-work-orders.query';
export { GetWorkOrderByIdQuery } from './queries/get-work-order-by-id/get-work-order-by-id.query';
export { GetWorkOrderByAppointmentQuery } from './queries/get-work-order-by-appointment/get-work-order-by-appointment.query';
export { GetMyWorkOrdersQuery } from './queries/get-my-work-orders/get-my-work-orders.query';
export { GetClientWorkOrdersQuery } from './queries/get-client-work-orders/get-client-work-orders.query';
export { GetNormDeviationReportQuery } from './queries/get-norm-deviation-report/get-norm-deviation-report.query';
export { GetCurrentStockForBranchQuery } from './queries/get-current-stock/get-current-stock.query';

export {
  WORK_ORDER_REPOSITORY,
  WORK_ORDER_READ_PORT,
  PHOTO_STORAGE_PORT,
  CATALOG_NORM_PORT,
  CATALOG_SKU_PORT,
  IAM_USER_PORT,
  CRM_CLIENT_PORT,
  CRM_VEHICLE_PORT,
  SCHEDULING_APPOINTMENT_PORT,
  INVENTORY_STOCK_PORT,
  CLOCK,
  ID_GENERATOR,
} from './di/tokens';

export {
  WorkOrderNotFoundError,
  InsufficientStockForCloseError,
} from './errors/application.errors';
export type { InsufficientLineInfo } from './errors/application.errors';

export { WorkOrderApplicationModule } from './work-order-application.module';

export type {
  IPhotoStoragePort,
  PhotoUploadInput,
  PhotoUploadResult,
} from './ports/photo-storage.port';
export type { ICatalogNormPort } from './ports/catalog-norm.port';
export type { ICatalogSkuPort, CatalogSkuReadModel } from './ports/catalog-sku.port';
export type { IIamUserPort, IamUserReadModel } from './ports/iam-user.port';
export type { ICrmClientPort, CrmClientReadModel } from './ports/crm-client.port';
export type { ICrmVehiclePort, CrmVehicleReadModel } from './ports/crm-vehicle.port';
export type {
  ISchedulingAppointmentPort,
  SchedulingAppointmentReadModel,
} from './ports/scheduling-appointment.port';
export type {
  IInventoryStockPort,
  ConsumeStockInput,
  CompensateStockInput,
  ConsumeStockResult,
} from './ports/inventory-stock.port';
export type {
  IWorkOrderReadPort,
  ListWorkOrdersFilter,
  NormDeviationReportFilter,
} from './ports/work-order-read.port';
export type { IWorkOrderPort } from './ports/work-order.port';
export type {
  WorkOrderListItemReadModel,
  WorkOrderDetailReadModel,
  ConsumptionLineReadModel,
  PhotoReadModel,
  PersonReadModel,
  ClientDetailReadModel,
  VehicleReadModel,
  WorkOrderServiceDetailReadModel,
  NormDeviationReportItem,
  CursorPaginatedResult,
} from './read-models/work-order.read-models';
export type { MyWorkOrderReadModel } from './queries/get-my-work-orders/get-my-work-orders.handler';
export type {
  OpenWorkOrderServiceInput,
  OpenWorkOrderNormInput,
} from './commands/open-work-order/open-work-order.command';
export type { ListWorkOrdersFilter as ListWorkOrdersQueryFilter } from './queries/list-work-orders/list-work-orders.query';
