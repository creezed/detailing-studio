import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

import { DomainEvent } from '@det/backend/shared/ddd';

import { EventTypeRegistry } from './event-registry';
import { OutboxEventSchema } from './outbox-event.schema';
import {
  DEFAULT_OUTBOX_POLLER_OPTIONS,
  OutboxPollerService,
  type OutboxEventBus,
  type OutboxPollerOptions,
} from './outbox-poller.service';

const AGGREGATE_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const OCCURRED_AT = new Date('2026-01-01T10:00:00.000Z');

class TestOutboxEvent extends DomainEvent {
  readonly eventType = 'TestOutboxEvent';

  constructor() {
    super({
      aggregateId: AGGREGATE_ID,
      aggregateType: 'TestAggregate',
      eventId: 'TestOutboxEvent:11111111-1111-4111-8111-111111111111:2026-01-01T10:00:00.000Z',
      occurredAt: OCCURRED_AT,
    });
  }
}

function options(overrides: Partial<OutboxPollerOptions> = {}): OutboxPollerOptions {
  return {
    ...DEFAULT_OUTBOX_POLLER_OPTIONS,
    baseBackoffMs: 0,
    batchSize: 100,
    enabled: false,
    ...overrides,
  };
}

async function insertOutboxEvent(orm: MikroORM<PostgreSqlDriver>): Promise<void> {
  const event = new TestOutboxEvent();
  const em = orm.em.fork();

  await em.persistAndFlush(
    em.create(OutboxEventSchema, {
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      failedAt: null,
      id: EVENT_ID,
      lastError: null,
      occurredAt: event.occurredAt,
      payload: event,
      publishedAt: null,
      retryAfterAt: null,
      retryCount: 0,
    }),
  );
}

function registry(): EventTypeRegistry {
  const eventRegistry = new EventTypeRegistry();
  eventRegistry.register({ ctor: TestOutboxEvent, eventType: 'TestOutboxEvent' });

  return eventRegistry;
}

function poller(orm: MikroORM<PostgreSqlDriver>, eventBus: OutboxEventBus): OutboxPollerService {
  return new OutboxPollerService(orm.em, eventBus, registry(), options());
}

describe('OutboxPollerService integration', () => {
  let container: StartedTestContainer;
  let orm: MikroORM<PostgreSqlDriver>;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'outbox_poller',
        POSTGRES_PASSWORD: 'outbox',
        POSTGRES_USER: 'outbox',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    orm = await MikroORM.init<PostgreSqlDriver>({
      clientUrl: `postgres://outbox:outbox@${container.getHost()}:${String(container.getMappedPort(5432))}/outbox_poller`,
      driver: PostgreSqlDriver,
      entities: [OutboxEventSchema],
    });

    await orm.schema.createSchema();
  }, 60_000);

  afterAll(async () => {
    await orm.close(true);
    await container.stop();
  });

  beforeEach(async () => {
    await orm.em.execute('truncate table outbox_events');
  });

  it('marks event as published after poller tick', async () => {
    const publishedEvents: DomainEvent[] = [];
    const eventBus: OutboxEventBus = {
      publish(event: DomainEvent): void {
        publishedEvents.push(event);
      },
    };

    await insertOutboxEvent(orm);

    await poller(orm, eventBus).processBatch();

    const stored = await orm.em.fork().findOneOrFail(OutboxEventSchema, { id: EVENT_ID });
    expect(stored.publishedAt).toBeInstanceOf(Date);
    expect(stored.failedAt).toBeNull();
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toBeInstanceOf(TestOutboxEvent);
  });

  it('marks event as failed after five handler errors', async () => {
    const eventBus: OutboxEventBus = {
      publish(): void {
        throw new Error('handler failed');
      },
    };
    const outboxPoller = poller(orm, eventBus);

    await insertOutboxEvent(orm);

    for (let index = 0; index < 5; index += 1) {
      await outboxPoller.processBatch();
    }

    const stored = await orm.em.fork().findOneOrFail(OutboxEventSchema, { id: EVENT_ID });
    expect(stored.publishedAt).toBeNull();
    expect(stored.retryCount).toBe(5);
    expect(stored.failedAt).toBeInstanceOf(Date);
    expect(stored.lastError).toBe('handler failed');
  });
});
