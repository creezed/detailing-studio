import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AddConsumptionHandler } from './commands/add-consumption/add-consumption.handler';
import { AddPhotoHandler } from './commands/add-photo/add-photo.handler';
import { CancelWorkOrderHandler } from './commands/cancel-work-order/cancel-work-order.handler';
import { OpenWorkOrderHandler } from './commands/open-work-order/open-work-order.handler';
import { RemoveConsumptionLineHandler } from './commands/remove-consumption-line/remove-consumption-line.handler';
import { RemovePhotoHandler } from './commands/remove-photo/remove-photo.handler';
import { ReturnToInProgressHandler } from './commands/return-to-in-progress/return-to-in-progress.handler';
import { SubmitForReviewHandler } from './commands/submit-for-review/submit-for-review.handler';
import { UpdateConsumptionLineHandler } from './commands/update-consumption-line/update-consumption-line.handler';
import { GetClientWorkOrdersHandler } from './queries/get-client-work-orders/get-client-work-orders.handler';
import { GetCurrentStockForBranchHandler } from './queries/get-current-stock/get-current-stock.handler';
import { GetMyWorkOrdersHandler } from './queries/get-my-work-orders/get-my-work-orders.handler';
import { GetNormDeviationReportHandler } from './queries/get-norm-deviation-report/get-norm-deviation-report.handler';
import { GetWorkOrderByAppointmentHandler } from './queries/get-work-order-by-appointment/get-work-order-by-appointment.handler';
import { GetWorkOrderByIdHandler } from './queries/get-work-order-by-id/get-work-order-by-id.handler';
import { ListWorkOrdersHandler } from './queries/list-work-orders/list-work-orders.handler';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  OpenWorkOrderHandler,
  AddPhotoHandler,
  RemovePhotoHandler,
  AddConsumptionHandler,
  UpdateConsumptionLineHandler,
  RemoveConsumptionLineHandler,
  SubmitForReviewHandler,
  ReturnToInProgressHandler,
  CancelWorkOrderHandler,
];

const QUERY_HANDLERS = [
  ListWorkOrdersHandler,
  GetWorkOrderByIdHandler,
  GetWorkOrderByAppointmentHandler,
  GetMyWorkOrdersHandler,
  GetClientWorkOrdersHandler,
  GetNormDeviationReportHandler,
  GetCurrentStockForBranchHandler,
];

@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class WorkOrderApplicationModule {
  static register(
    providers: readonly Provider[],
    imports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    return {
      exports: [CqrsModule, ...providers],
      imports: [CqrsModule, ...imports],
      module: WorkOrderApplicationModule,
      providers: [...providers, ...COMMAND_HANDLERS, ...QUERY_HANDLERS],
    };
  }
}
