import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { PiiAccessLogger } from './audit/pii-access-logger.service';
import { AddVehicleHandler } from './commands/add-vehicle/add-vehicle.handler';
import { AnonymizeClientHandler } from './commands/anonymize-client/anonymize-client.handler';
import { CancelAnonymizationRequestHandler } from './commands/cancel-anonymization-request/cancel-anonymization-request.handler';
import { DeactivateVehicleHandler } from './commands/deactivate-vehicle/deactivate-vehicle.handler';
import { GiveConsentHandler } from './commands/give-consent/give-consent.handler';
import { RegisterGuestClientHandler } from './commands/register-guest-client/register-guest-client.handler';
import { RegisterRegularClientHandler } from './commands/register-regular-client/register-regular-client.handler';
import { RequestClientAnonymizationHandler } from './commands/request-client-anonymization/request-client-anonymization.handler';
import { RequestClientDataExportHandler } from './commands/request-client-data-export/request-client-data-export.handler';
import { RevokeConsentHandler } from './commands/revoke-consent/revoke-consent.handler';
import { UpdateClientProfileHandler } from './commands/update-client-profile/update-client-profile.handler';
import { UpdateVehicleHandler } from './commands/update-vehicle/update-vehicle.handler';
import { UpgradeClientToRegularHandler } from './commands/upgrade-client-to-regular/upgrade-client-to-regular.handler';
import { VisitHistoryProjector } from './projections/visit-history.projector';
import { GetClientByIdHandler } from './queries/get-client-by-id/get-client-by-id.handler';
import { GetClientByPhoneHandler } from './queries/get-client-by-phone/get-client-by-phone.handler';
import { GetClientDataExportHandler } from './queries/get-client-data-export/get-client-data-export.handler';
import { GetClientVehiclesHandler } from './queries/get-client-vehicles/get-client-vehicles.handler';
import { GetClientVisitHistoryHandler } from './queries/get-client-visit-history/get-client-visit-history.handler';
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
  GiveConsentHandler,
  RevokeConsentHandler,
  RequestClientAnonymizationHandler,
  AnonymizeClientHandler,
  CancelAnonymizationRequestHandler,
  RequestClientDataExportHandler,
];

const QUERY_HANDLERS = [
  ListClientsHandler,
  GetClientByIdHandler,
  GetClientByPhoneHandler,
  GetClientVehiclesHandler,
  GetClientDataExportHandler,
  GetClientVisitHistoryHandler,
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
      providers: [
        ...providers,
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
        PiiAccessLogger,
        VisitHistoryProjector,
      ],
    };
  }
}
