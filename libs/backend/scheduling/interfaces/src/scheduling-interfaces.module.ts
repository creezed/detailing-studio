import { Module } from '@nestjs/common';

import { BaysController } from './http/bays.controller';
import { BranchesController } from './http/branches.controller';
import { MasterSchedulesController } from './http/master-schedules.controller';

@Module({
  controllers: [BranchesController, BaysController, MasterSchedulesController],
})
export class SchedulingInterfacesModule {}
