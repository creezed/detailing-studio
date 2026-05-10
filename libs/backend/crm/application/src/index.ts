export { ClientId, VehicleId } from '@det/backend-crm-domain';

export * from './audit/pii-access-logger.service';
export * from './commands/add-vehicle/add-vehicle.command';
export * from './commands/add-vehicle/add-vehicle.handler';
export * from './commands/anonymize-client/anonymize-client.command';
export * from './commands/anonymize-client/anonymize-client.handler';
export * from './commands/cancel-anonymization-request/cancel-anonymization-request.command';
export * from './commands/cancel-anonymization-request/cancel-anonymization-request.handler';
export * from './commands/deactivate-vehicle/deactivate-vehicle.command';
export * from './commands/deactivate-vehicle/deactivate-vehicle.handler';
export * from './commands/give-consent/give-consent.command';
export * from './commands/give-consent/give-consent.handler';
export * from './commands/register-guest-client/register-guest-client.command';
export * from './commands/register-guest-client/register-guest-client.handler';
export * from './commands/register-regular-client/register-regular-client.command';
export * from './commands/register-regular-client/register-regular-client.handler';
export * from './commands/request-client-anonymization/request-client-anonymization.command';
export * from './commands/request-client-anonymization/request-client-anonymization.handler';
export * from './commands/request-client-data-export/request-client-data-export.command';
export * from './commands/request-client-data-export/request-client-data-export.handler';
export * from './commands/revoke-consent/revoke-consent.command';
export * from './commands/revoke-consent/revoke-consent.handler';
export * from './commands/update-client-profile/update-client-profile.command';
export * from './commands/update-client-profile/update-client-profile.handler';
export * from './commands/update-vehicle/update-vehicle.command';
export * from './commands/update-vehicle/update-vehicle.handler';
export * from './commands/upgrade-client-to-regular/upgrade-client-to-regular.command';
export * from './commands/upgrade-client-to-regular/upgrade-client-to-regular.handler';
export * from './crm-application.module';
export * from './di/tokens';
export * from './errors/application.errors';
export * from './events/client-anonymization-requested.event';
export type { IAnonymizationRequestPort } from './ports/anonymization-request.port';
export type { IClientReadPort, ListClientsFilter, PaginatedResult } from './ports/client-read.port';
export type { ICrmConfigPort } from './ports/config.port';
export type { IFileStoragePort } from './ports/file-storage.port';
export type {
  IPiiAccessLogPort,
  PiiAccessLogEntry,
  PiiOperation,
} from './ports/pii-access-log.port';
export * from './queries/get-client-by-id/get-client-by-id.handler';
export * from './queries/get-client-by-id/get-client-by-id.query';
export * from './queries/get-client-by-phone/get-client-by-phone.handler';
export * from './queries/get-client-by-phone/get-client-by-phone.query';
export * from './queries/get-client-data-export/get-client-data-export.handler';
export * from './queries/get-client-data-export/get-client-data-export.query';
export * from './queries/get-client-vehicles/get-client-vehicles.handler';
export * from './queries/get-client-vehicles/get-client-vehicles.query';
export * from './queries/list-clients/list-clients.handler';
export * from './queries/list-clients/list-clients.query';
export * from './read-models/client.read-model';
