import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Global, Module, type DynamicModule } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { EventTypeRegistry } from './event-registry';
import { OutboxEventSchema } from './outbox-event.schema';
import {
  DEFAULT_OUTBOX_POLLER_OPTIONS,
  OUTBOX_POLLER_OPTIONS,
  OutboxPollerService,
  type OutboxPollerOptions,
} from './outbox-poller.service';
import { OutboxService } from './outbox.service';

const OUTBOX_PROVIDERS = [
  EventTypeRegistry,
  OutboxPollerService,
  OutboxService,
  {
    provide: OUTBOX_POLLER_OPTIONS,
    useValue: DEFAULT_OUTBOX_POLLER_OPTIONS,
  },
];

@Global()
@Module({
  exports: [EventTypeRegistry, OutboxPollerService, OutboxService],
  imports: [CqrsModule, MikroOrmModule.forFeature([OutboxEventSchema])],
  providers: OUTBOX_PROVIDERS,
})
export class OutboxModule {
  static register(options: Partial<OutboxPollerOptions> = {}): DynamicModule {
    return {
      exports: [EventTypeRegistry, OutboxPollerService, OutboxService],
      global: true,
      imports: [CqrsModule, MikroOrmModule.forFeature([OutboxEventSchema])],
      module: OutboxModule,
      providers: [
        EventTypeRegistry,
        OutboxPollerService,
        OutboxService,
        {
          provide: OUTBOX_POLLER_OPTIONS,
          useValue: {
            ...DEFAULT_OUTBOX_POLLER_OPTIONS,
            ...options,
          },
        },
      ],
    };
  }
}
