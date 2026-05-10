import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, type OnModuleInit, type Provider } from '@nestjs/common';

import {
  ANONYMIZATION_REQUEST_PORT,
  CLIENT_READ_PORT,
  CLIENT_REPOSITORY,
  CLOCK,
  CRM_CONFIG_PORT,
  CrmApplicationModule,
  FILE_STORAGE_PORT,
  ID_GENERATOR,
  PII_ACCESS_LOG_PORT,
  VISIT_HISTORY_READ_PORT,
  VISIT_HISTORY_WRITE_PORT,
} from '@det/backend-crm-application';
import {
  ClientAnonymized,
  ClientConsentGiven,
  ClientConsentRevoked,
  ClientProfileUpdated,
  ClientRegistered,
  ClientUpgradedToRegular,
  ClientVehicleAdded,
  ClientVehicleDeactivated,
  ClientVehicleUpdated,
} from '@det/backend-crm-domain';
import { EventTypeRegistry, OutboxModule } from '@det/backend-shared-outbox';

import { CrmAnonymizationRequestAdapter } from './adapters/crm-anonymization-request.adapter';
import { CrmClientReadAdapter } from './adapters/crm-client-read.adapter';
import { CrmConfigAdapter } from './adapters/crm-config.adapter';
import { CrmFileStorageStubAdapter } from './adapters/crm-file-storage-stub.adapter';
import { CrmPiiAccessLogAdapter } from './adapters/crm-pii-access-log.adapter';
import { CrmVisitHistoryReadAdapter } from './adapters/crm-visit-history-read.adapter';
import { CrmVisitHistoryWriteAdapter } from './adapters/crm-visit-history-write.adapter';
import { CryptoIdGeneratorAdapter } from './adapters/crypto-id-generator.adapter';
import { SystemClockAdapter } from './adapters/system-clock.adapter';
import { CrmClientSchema } from './persistence/client/crm-client.schema';
import { CrmConsentSchema } from './persistence/client/crm-consent.schema';
import { CrmVehicleSchema } from './persistence/client/crm-vehicle.schema';
import { CrmAnonymizationRequestSchema } from './persistence/crm-anonymization-request.schema';
import { CrmPiiAccessLogSchema } from './persistence/crm-pii-access-log.schema';
import { CrmVisitHistorySchema } from './persistence/projections/crm-visit-history.schema';
import { CrmClientRepository } from './repositories/crm-client.repository';

const CRM_SCHEMAS = [
  CrmClientSchema,
  CrmVehicleSchema,
  CrmConsentSchema,
  CrmVisitHistorySchema,
  CrmAnonymizationRequestSchema,
  CrmPiiAccessLogSchema,
];

const INFRASTRUCTURE_PROVIDERS: readonly Provider[] = [
  CrmClientRepository,
  CrmClientReadAdapter,
  CrmAnonymizationRequestAdapter,
  CrmPiiAccessLogAdapter,
  CrmVisitHistoryReadAdapter,
  CrmVisitHistoryWriteAdapter,
  CrmFileStorageStubAdapter,
  SystemClockAdapter,
  CryptoIdGeneratorAdapter,
  CrmConfigAdapter,
  {
    provide: CLIENT_REPOSITORY,
    useExisting: CrmClientRepository,
  },
  {
    provide: CLIENT_READ_PORT,
    useExisting: CrmClientReadAdapter,
  },
  {
    provide: ANONYMIZATION_REQUEST_PORT,
    useExisting: CrmAnonymizationRequestAdapter,
  },
  {
    provide: PII_ACCESS_LOG_PORT,
    useExisting: CrmPiiAccessLogAdapter,
  },
  {
    provide: VISIT_HISTORY_READ_PORT,
    useExisting: CrmVisitHistoryReadAdapter,
  },
  {
    provide: VISIT_HISTORY_WRITE_PORT,
    useExisting: CrmVisitHistoryWriteAdapter,
  },
  {
    provide: FILE_STORAGE_PORT,
    useExisting: CrmFileStorageStubAdapter,
  },
  {
    provide: CLOCK,
    useExisting: SystemClockAdapter,
  },
  {
    provide: ID_GENERATOR,
    useExisting: CryptoIdGeneratorAdapter,
  },
  {
    provide: CRM_CONFIG_PORT,
    useExisting: CrmConfigAdapter,
  },
];

@Module({
  exports: [CrmApplicationModule],
  imports: [
    CrmApplicationModule.register(INFRASTRUCTURE_PROVIDERS, [
      MikroOrmModule.forFeature(CRM_SCHEMAS),
      OutboxModule,
    ]),
  ],
})
export class CrmInfrastructureModule implements OnModuleInit {
  constructor(private readonly eventRegistry: EventTypeRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register([
      { ctor: ClientRegistered, eventType: 'ClientRegistered' },
      { ctor: ClientUpgradedToRegular, eventType: 'ClientUpgradedToRegular' },
      { ctor: ClientProfileUpdated, eventType: 'ClientProfileUpdated' },
      { ctor: ClientConsentGiven, eventType: 'ClientConsentGiven' },
      { ctor: ClientConsentRevoked, eventType: 'ClientConsentRevoked' },
      { ctor: ClientVehicleAdded, eventType: 'ClientVehicleAdded' },
      { ctor: ClientVehicleUpdated, eventType: 'ClientVehicleUpdated' },
      { ctor: ClientVehicleDeactivated, eventType: 'ClientVehicleDeactivated' },
      { ctor: ClientAnonymized, eventType: 'ClientAnonymized' },
    ]);
  }
}
