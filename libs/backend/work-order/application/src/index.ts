export { OpenWorkOrderCommand } from './commands/open-work-order/open-work-order.command';
export { AddPhotoCommand } from './commands/add-photo/add-photo.command';
export { RemovePhotoCommand } from './commands/remove-photo/remove-photo.command';
export { AddConsumptionCommand } from './commands/add-consumption/add-consumption.command';
export { UpdateConsumptionLineCommand } from './commands/update-consumption-line/update-consumption-line.command';
export { RemoveConsumptionLineCommand } from './commands/remove-consumption-line/remove-consumption-line.command';
export { SubmitForReviewCommand } from './commands/submit-for-review/submit-for-review.command';
export { ReturnToInProgressCommand } from './commands/return-to-in-progress/return-to-in-progress.command';
export { CancelWorkOrderCommand } from './commands/cancel-work-order/cancel-work-order.command';

export {
  WORK_ORDER_REPOSITORY,
  PHOTO_STORAGE_PORT,
  CATALOG_NORM_PORT,
  CLOCK,
  ID_GENERATOR,
} from './di/tokens';

export { WorkOrderNotFoundError } from './errors/application.errors';

export { WorkOrderApplicationModule } from './work-order-application.module';

export type {
  IPhotoStoragePort,
  PhotoUploadInput,
  PhotoUploadResult,
} from './ports/photo-storage.port';
export type { ICatalogNormPort } from './ports/catalog-norm.port';
export type {
  OpenWorkOrderServiceInput,
  OpenWorkOrderNormInput,
} from './commands/open-work-order/open-work-order.command';
