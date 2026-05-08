import { Module } from '@nestjs/common';

import { CategoriesController } from './http/categories.controller';
import { ServicesController } from './http/services.controller';

@Module({
  controllers: [CategoriesController, ServicesController],
})
export class CatalogInterfacesModule {}
