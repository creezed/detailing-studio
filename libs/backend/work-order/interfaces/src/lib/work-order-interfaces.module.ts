import { Module } from '@nestjs/common';

import { WorkOrderConsumptionController } from '../http/work-order-consumption.controller';
import { WorkOrderPhotosController } from '../http/work-order-photos.controller';
import { WorkOrderReportsController } from '../http/work-order-reports.controller';
import { WorkOrdersController } from '../http/work-orders.controller';

@Module({
  controllers: [
    WorkOrdersController,
    WorkOrderReportsController,
    WorkOrderPhotosController,
    WorkOrderConsumptionController,
  ],
})
export class WorkOrderInterfacesModule {}
