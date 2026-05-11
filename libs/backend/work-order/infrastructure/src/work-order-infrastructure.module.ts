import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { EventTypeRegistry, OutboxModule } from '@det/backend-shared-outbox';
import {
  WORK_ORDER_READ_PORT,
  WORK_ORDER_REPOSITORY,
  WorkOrderApplicationModule,
} from '@det/backend-work-order-application';
import {
  WorkOrderCancelled,
  WorkOrderClosed,
  WorkOrderClosingReverted,
  WorkOrderClosingStarted,
  WorkOrderConsumptionAdded,
  WorkOrderConsumptionRemoved,
  WorkOrderConsumptionUpdated,
  WorkOrderOpened,
  WorkOrderPhotoAdded,
  WorkOrderPhotoRemoved,
  WorkOrderReopened,
  WorkOrderReturnedToInProgress,
  WorkOrderSubmittedForReview,
} from '@det/backend-work-order-domain';

import { WorkOrderPortAdapter } from './acl/work-order-port.adapter';
import { WoWorkOrderReadPortAdapter } from './adapters/wo-work-order-read-port.adapter';
import { WoConsumptionLineSchema } from './persistence/wo-consumption-line.schema';
import { WoPhotoSchema } from './persistence/wo-photo.schema';
import { WoWorkOrderSchema } from './persistence/wo-work-order.schema';
import { WoWorkOrderRepository } from './repositories/wo-work-order.repository';
import { WORK_ORDER_PORT } from './tokens';

import type { DynamicModule, ModuleMetadata, OnModuleInit, Provider } from '@nestjs/common';

const WO_SCHEMAS = [WoWorkOrderSchema, WoConsumptionLineSchema, WoPhotoSchema];

@Module({})
export class WorkOrderInfrastructureModule implements OnModuleInit {
  static register(
    externalProviders: readonly Provider[] = [],
    externalImports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    const infrastructureProviders: Provider[] = [
      WoWorkOrderRepository,
      WoWorkOrderReadPortAdapter,
      WorkOrderPortAdapter,
      { provide: WORK_ORDER_REPOSITORY, useExisting: WoWorkOrderRepository },
      { provide: WORK_ORDER_READ_PORT, useExisting: WoWorkOrderReadPortAdapter },
      { provide: WORK_ORDER_PORT, useExisting: WorkOrderPortAdapter },
    ];

    return {
      exports: [WORK_ORDER_PORT, ...infrastructureProviders, ...externalProviders],
      imports: [
        MikroOrmModule.forFeature(WO_SCHEMAS),
        OutboxModule,
        WorkOrderApplicationModule.register([...infrastructureProviders, ...externalProviders]),
        ...externalImports,
      ],
      module: WorkOrderInfrastructureModule,
      providers: [...infrastructureProviders, ...externalProviders],
    };
  }

  constructor(private readonly eventRegistry: EventTypeRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register([
      { ctor: WorkOrderOpened, eventType: 'WorkOrderOpened' },
      { ctor: WorkOrderPhotoAdded, eventType: 'WorkOrderPhotoAdded' },
      { ctor: WorkOrderPhotoRemoved, eventType: 'WorkOrderPhotoRemoved' },
      { ctor: WorkOrderConsumptionAdded, eventType: 'WorkOrderConsumptionAdded' },
      { ctor: WorkOrderConsumptionUpdated, eventType: 'WorkOrderConsumptionUpdated' },
      { ctor: WorkOrderConsumptionRemoved, eventType: 'WorkOrderConsumptionRemoved' },
      { ctor: WorkOrderSubmittedForReview, eventType: 'WorkOrderSubmittedForReview' },
      { ctor: WorkOrderReturnedToInProgress, eventType: 'WorkOrderReturnedToInProgress' },
      { ctor: WorkOrderCancelled, eventType: 'WorkOrderCancelled' },
      { ctor: WorkOrderClosingStarted, eventType: 'WorkOrderClosingStarted' },
      { ctor: WorkOrderClosingReverted, eventType: 'WorkOrderClosingReverted' },
      { ctor: WorkOrderClosed, eventType: 'WorkOrderClosed' },
      { ctor: WorkOrderReopened, eventType: 'WorkOrderReopened' },
    ]);
  }
}
