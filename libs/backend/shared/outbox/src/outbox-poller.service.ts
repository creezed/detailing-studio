import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import {
  Queue,
  Worker,
  type ConnectionOptions,
  type QueueOptions,
  type WorkerOptions,
} from 'bullmq';
import pino from 'pino';

import type { DomainEvent } from '@det/backend-shared-ddd';

import { EventTypeRegistry } from './event-registry';
import { OutboxEventSchema } from './outbox-event.schema';

export interface OutboxEventBus {
  publish(event: DomainEvent): unknown;
}

export interface OutboxPollerOptions {
  readonly baseBackoffMs: number;
  readonly batchSize: number;
  readonly connection?: ConnectionOptions;
  readonly enabled: boolean;
  readonly maxRetryCount: number;
  readonly pollIntervalMs: number;
  readonly queueName: string;
}

export const OUTBOX_POLLER_OPTIONS = Symbol('OUTBOX_POLLER_OPTIONS');

export const DEFAULT_OUTBOX_POLLER_OPTIONS: OutboxPollerOptions = {
  baseBackoffMs: 1_000,
  batchSize: 100,
  enabled: false,
  maxRetryCount: 5,
  pollIntervalMs: 1_000,
  queueName: 'outbox-poller',
};

const OUTBOX_POLLER_JOB_NAME = 'outbox-poller.tick';
const OUTBOX_POLLER_JOB_ID = 'outbox-poller.repeatable';

@Injectable()
export class OutboxPollerService implements OnApplicationShutdown, OnModuleInit {
  private readonly logger: ReturnType<typeof pino> = pino({ name: 'OutboxPollerService' });
  private activeBatch: Promise<void> | null = null;
  private queue: Queue | null = null;
  private shuttingDown = false;
  private worker: Worker | null = null;

  constructor(
    private readonly em: EntityManager,
    @Inject(EventBus) private readonly eventBus: OutboxEventBus,
    private readonly registry: EventTypeRegistry,
    @Inject(OUTBOX_POLLER_OPTIONS) private readonly options: OutboxPollerOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.options.enabled) {
      return;
    }

    this.queue = new Queue(this.options.queueName, this.bullQueueOptions());
    this.worker = new Worker(
      this.options.queueName,
      () => this.processBatch(),
      this.bullWorkerOptions(),
    );

    await this.queue.add(
      OUTBOX_POLLER_JOB_NAME,
      {},
      {
        jobId: OUTBOX_POLLER_JOB_ID,
        removeOnComplete: true,
        removeOnFail: true,
        repeat: {
          every: this.options.pollIntervalMs,
        },
      },
    );
  }

  async onApplicationShutdown(): Promise<void> {
    this.shuttingDown = true;

    if (this.worker) {
      await this.worker.close();
    }

    if (this.activeBatch) {
      await this.activeBatch.catch((error: unknown) => {
        this.logger.error({ error: errorMessage(error) }, 'Outbox batch failed during shutdown');
      });
    }

    if (this.queue) {
      await this.queue.close();
    }
  }

  processBatch(): Promise<void> {
    if (this.activeBatch) {
      return this.activeBatch;
    }

    const batch = this.runBatch();
    this.activeBatch = batch.finally(() => {
      this.activeBatch = null;
    });

    return this.activeBatch;
  }

  private async runBatch(): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    const em = this.em.fork();
    const events = await em.find(
      OutboxEventSchema,
      {
        $or: [{ retryAfterAt: null }, { retryAfterAt: { $lte: new Date() } }],
        failedAt: null,
        publishedAt: null,
      },
      {
        limit: this.options.batchSize,
        orderBy: { occurredAt: QueryOrder.ASC },
      },
    );

    for (const event of events) {
      await this.processEvent(em, event);
    }
  }

  private async processEvent(em: EntityManager, outboxEvent: OutboxEventSchema): Promise<void> {
    try {
      const event = this.registry.deserialize(outboxEvent.eventType, outboxEvent.payload);
      await this.publish(event);

      outboxEvent.publishedAt = new Date();
      outboxEvent.lastError = null;
      outboxEvent.retryAfterAt = null;
      await em.flush();
    } catch (error) {
      await this.handlePublishError(em, outboxEvent, error);
    }
  }

  private async handlePublishError(
    em: EntityManager,
    outboxEvent: OutboxEventSchema,
    error: unknown,
  ): Promise<void> {
    const nextRetryCount = outboxEvent.retryCount + 1;
    const now = new Date();

    outboxEvent.retryCount = nextRetryCount;
    outboxEvent.lastError = errorMessage(error);

    if (nextRetryCount >= this.options.maxRetryCount) {
      outboxEvent.failedAt = now;
      outboxEvent.retryAfterAt = null;
      this.alertFailedEvent(outboxEvent);
    } else {
      outboxEvent.retryAfterAt = new Date(now.getTime() + this.backoffMs(nextRetryCount));
    }

    await em.flush();
  }

  private async publish(event: DomainEvent): Promise<void> {
    const result: unknown = this.eventBus.publish(event);

    if (isPromiseLike(result)) {
      await result;
    }
  }

  private backoffMs(retryCount: number): number {
    return this.options.baseBackoffMs * 2 ** Math.max(retryCount - 1, 0);
  }

  private bullQueueOptions(): QueueOptions | undefined {
    if (!this.options.connection) {
      return undefined;
    }

    return { connection: this.options.connection };
  }

  private bullWorkerOptions(): WorkerOptions | undefined {
    if (!this.options.connection) {
      return undefined;
    }

    return { connection: this.options.connection };
  }

  private alertFailedEvent(outboxEvent: OutboxEventSchema): void {
    this.logger.error(
      {
        eventId: outboxEvent.id,
        eventType: outboxEvent.eventType,
        lastError: outboxEvent.lastError,
        retryCount: outboxEvent.retryCount,
      },
      'Outbox event failed permanently',
    );
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const thenValue: unknown = Reflect.get(value, 'then');

  return typeof thenValue === 'function';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
