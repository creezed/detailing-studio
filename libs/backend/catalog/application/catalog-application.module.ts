import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

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
      providers: [...providers],
    };
  }
}
