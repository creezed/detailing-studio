import { Module } from '@nestjs/common';

import { WorkOrderPortAdapter } from './acl/work-order-port.adapter';
import { WORK_ORDER_PORT } from './tokens';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

@Module({})
export class WorkOrderInfrastructureModule {
  static register(
    externalProviders: readonly Provider[],
    externalImports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    const aclProviders: Provider[] = [
      WorkOrderPortAdapter,
      {
        provide: WORK_ORDER_PORT,
        useExisting: WorkOrderPortAdapter,
      },
    ];

    return {
      exports: [WORK_ORDER_PORT, ...externalProviders],
      imports: [...externalImports],
      module: WorkOrderInfrastructureModule,
      providers: [...aclProviders, ...externalProviders],
    };
  }
}
