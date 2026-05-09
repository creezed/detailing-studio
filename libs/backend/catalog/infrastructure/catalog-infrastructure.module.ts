import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, type OnModuleInit, type Provider } from '@nestjs/common';

import {
  CLOCK,
  CatalogApplicationModule,
  ID_GENERATOR,
  PRICE_HISTORY_PORT,
  SERVICE_CATEGORY_REPOSITORY,
  SERVICE_READ_PORT,
  SERVICE_REPOSITORY,
} from '@det/backend/catalog/application';
import {
  ServiceCategoryCreated,
  ServiceCategoryDeactivated,
  ServiceCreated,
  ServiceDeactivated,
  ServiceMaterialNormsChanged,
  ServicePriceChanged,
} from '@det/backend/catalog/domain';
import { EventTypeRegistry, OutboxModule } from '@det/backend/shared/outbox';

import { CryptoIdGeneratorAdapter } from './adapters/crypto-id-generator.adapter';
import { PriceHistoryPortAdapter } from './adapters/price-history-port.adapter';
import { SystemClockAdapter } from './adapters/system-clock.adapter';
import { CatalogMaterialNormSchema } from './persistence/catalog-material-norm.schema';
import { CatalogServiceCategorySchema } from './persistence/catalog-service-category.schema';
import { CatalogServicePriceHistorySchema } from './persistence/catalog-service-price-history.schema';
import { CatalogServicePricingSchema } from './persistence/catalog-service-pricing.schema';
import { CatalogServiceSchema } from './persistence/catalog-service.schema';
import { CatalogServiceReadAdapter } from './read-models/catalog-service-read.adapter';
import { CatalogServiceCategoryRepository } from './repositories/catalog-service-category.repository';
import { CatalogServiceRepository } from './repositories/catalog-service.repository';

const CATALOG_SCHEMAS = [
  CatalogServiceCategorySchema,
  CatalogServiceSchema,
  CatalogServicePricingSchema,
  CatalogMaterialNormSchema,
  CatalogServicePriceHistorySchema,
];

const INFRASTRUCTURE_PROVIDERS: readonly Provider[] = [
  CatalogServiceCategoryRepository,
  CatalogServiceReadAdapter,
  CatalogServiceRepository,
  CryptoIdGeneratorAdapter,
  PriceHistoryPortAdapter,
  SystemClockAdapter,
  {
    provide: SERVICE_CATEGORY_REPOSITORY,
    useExisting: CatalogServiceCategoryRepository,
  },
  {
    provide: SERVICE_REPOSITORY,
    useExisting: CatalogServiceRepository,
  },
  {
    provide: SERVICE_READ_PORT,
    useExisting: CatalogServiceReadAdapter,
  },
  {
    provide: ID_GENERATOR,
    useExisting: CryptoIdGeneratorAdapter,
  },
  {
    provide: CLOCK,
    useExisting: SystemClockAdapter,
  },
  {
    provide: PRICE_HISTORY_PORT,
    useExisting: PriceHistoryPortAdapter,
  },
];

@Module({
  exports: [CatalogApplicationModule],
  imports: [
    CatalogApplicationModule.register(INFRASTRUCTURE_PROVIDERS, [
      MikroOrmModule.forFeature(CATALOG_SCHEMAS),
      OutboxModule,
    ]),
  ],
})
export class CatalogInfrastructureModule implements OnModuleInit {
  constructor(private readonly eventRegistry: EventTypeRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register([
      { ctor: ServiceCategoryCreated, eventType: 'ServiceCategoryCreated' },
      { ctor: ServiceCategoryDeactivated, eventType: 'ServiceCategoryDeactivated' },
      { ctor: ServiceCreated, eventType: 'ServiceCreated' },
      { ctor: ServicePriceChanged, eventType: 'ServicePriceChanged' },
      { ctor: ServiceMaterialNormsChanged, eventType: 'ServiceMaterialNormsChanged' },
      { ctor: ServiceDeactivated, eventType: 'ServiceDeactivated' },
    ]);
  }
}
