import { Module } from '@nestjs/common';

import { AnonymizationController } from '../http/anonymization.controller';
import { ClientsController } from '../http/clients.controller';
import { ConsentsController } from '../http/consents.controller';
import { VehiclesController } from '../http/vehicles.controller';

@Module({
  controllers: [ClientsController, VehiclesController, ConsentsController, AnonymizationController],
})
export class CrmInterfacesModule {}
