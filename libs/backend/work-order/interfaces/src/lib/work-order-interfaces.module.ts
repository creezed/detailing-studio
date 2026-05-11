import { Module } from '@nestjs/common';

import { WorkOrderReportsController } from '../http/work-order-reports.controller';
import { WorkOrdersController } from '../http/work-orders.controller';

@Module({
  controllers: [WorkOrdersController, WorkOrderReportsController],
})
export class WorkOrderInterfacesModule {}
