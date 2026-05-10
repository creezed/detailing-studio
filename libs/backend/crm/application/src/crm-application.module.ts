import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AddVehicleHandler } from './commands/add-vehicle/add-vehicle.handler';
import { DeactivateVehicleHandler } from './commands/deactivate-vehicle/deactivate-vehicle.handler';
import { RegisterGuestClientHandler } from './commands/register-guest-client/register-guest-client.handler';
import { RegisterRegularClientHandler } from './commands/register-regular-client/register-regular-client.handler';
import { UpdateClientProfileHandler } from './commands/update-client-profile/update-client-profile.handler';
import { UpdateVehicleHandler } from './commands/update-vehicle/update-vehicle.handler';
import { UpgradeClientToRegularHandler } from './commands/upgrade-client-to-regular/upgrade-client-to-regular.handler';
import { GetClientByIdHandler } from './queries/get-client-by-id/get-client-by-id.handler';
import { GetClientByPhoneHandler } from './queries/get-client-by-phone/get-client-by-phone.handler';
import { GetClientVehiclesHandler } from './queries/get-client-vehicles/get-client-vehicles.handler';
import { ListClientsHandler } from './queries/list-clients/list-clients.handler';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  RegisterRegularClientHandler,
  RegisterGuestClientHandler,
  UpgradeClientToRegularHandler,
  UpdateClientProfileHandler,
  AddVehicleHandler,
  UpdateVehicleHandler,
  DeactivateVehicleHandler,
];

const QUERY_HANDLERS = [
  ListClientsHandler,
  GetClientByIdHandler,
  GetClientByPhoneHandler,
  GetClientVehiclesHandler,
];

@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class CrmApplicationModule {
  static register(
    providers: readonly Provider[],
    imports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    return {
      exports: [CqrsModule, ...providers],
      imports: [CqrsModule, ...imports],
      module: CrmApplicationModule,
      providers: [...providers, ...COMMAND_HANDLERS, ...QUERY_HANDLERS],
    };
  }
}
