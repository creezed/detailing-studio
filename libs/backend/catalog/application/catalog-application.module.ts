import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ChangeServicePriceHandler } from './commands/change-service-price/change-service-price.handler';
import { CreateServiceHandler } from './commands/create-service/create-service.handler';
import { CreateServiceCategoryHandler } from './commands/create-service-category/create-service-category.handler';
import { DeactivateServiceHandler } from './commands/deactivate-service/deactivate-service.handler';
import { DeactivateServiceCategoryHandler } from './commands/deactivate-service-category/deactivate-service-category.handler';
import { SetServiceMaterialNormsHandler } from './commands/set-service-material-norms/set-service-material-norms.handler';
import { UpdateServiceHandler } from './commands/update-service/update-service.handler';
import { UpdateServiceCategoryHandler } from './commands/update-service-category/update-service-category.handler';
import { GetClientServiceCatalogHandler } from './queries/get-client-service-catalog/get-client-service-catalog.handler';
import { GetServiceByIdHandler } from './queries/get-service-by-id/get-service-by-id.handler';
import { GetServicePriceHistoryHandler } from './queries/get-service-price-history/get-service-price-history.handler';
import { ListServiceCategoriesHandler } from './queries/list-service-categories/list-service-categories.handler';
import { ListServicesHandler } from './queries/list-services/list-services.handler';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  ChangeServicePriceHandler,
  CreateServiceHandler,
  CreateServiceCategoryHandler,
  DeactivateServiceHandler,
  DeactivateServiceCategoryHandler,
  SetServiceMaterialNormsHandler,
  UpdateServiceHandler,
  UpdateServiceCategoryHandler,
];

const QUERY_HANDLERS = [
  GetClientServiceCatalogHandler,
  GetServiceByIdHandler,
  GetServicePriceHistoryHandler,
  ListServiceCategoriesHandler,
  ListServicesHandler,
];

@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class CatalogApplicationModule {
  static register(
    providers: readonly Provider[],
    imports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    return {
      exports: [CqrsModule, ...providers],
      global: false,
      imports: [CqrsModule, ...imports],
      module: CatalogApplicationModule,
      providers: [...providers, ...COMMAND_HANDLERS, ...QUERY_HANDLERS],
    };
  }
}
