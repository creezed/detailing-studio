import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { GenericContainer, Wait } from 'testcontainers';

import {
  BilInvoiceSchema,
  BilPlanSchema,
  BilSubscriptionSchema,
} from '@det/backend-billing-infrastructure';
import { OutboxEventSchema } from '@det/backend-shared-outbox';

import { RetentionCron } from '../lib/retention.cron';

import type { StartedTestContainer } from 'testcontainers';

const ALL_ENTITIES = [BilPlanSchema, BilSubscriptionSchema, BilInvoiceSchema, OutboxEventSchema];

describe('RetentionCron', () => {
  let container: StartedTestContainer;
  let orm: MikroORM<PostgreSqlDriver>;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'ret_test',
        POSTGRES_PASSWORD: 'ret',
        POSTGRES_USER: 'ret',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    orm = await MikroORM.init<PostgreSqlDriver>({
      clientUrl: `postgres://ret:ret@${container.getHost()}:${String(container.getMappedPort(5432))}/ret_test`,
      driver: PostgreSqlDriver,
      entities: ALL_ENTITIES,
    });

    await orm.schema.createSchema();
  }, 60_000);

  afterAll(async () => {
    await orm.close(true);
    await container.stop();
  });

  beforeEach(async () => {
    await orm.em.execute(
      'truncate table "outbox_events", "bil_invoice", "bil_subscription", "bil_plan" cascade',
    );
  });

  it('deletes old VOIDED invoices but keeps fresh ones', async () => {
    const em = orm.em.fork();
    const conn = em.getConnection();

    await conn.execute(
      `INSERT INTO "bil_plan" ("code", "name", "price_cents_per_month", "created_at", "updated_at")
       VALUES ('STARTER', 'Starter', 299000, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
    );

    await conn.execute(
      `INSERT INTO "bil_subscription" ("id", "tenant_id", "plan_code", "status", "current_period_started_at", "next_billing_at", "created_at", "updated_at")
       VALUES ('a1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', 'STARTER', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())`,
    );

    await conn.execute(
      `INSERT INTO "bil_invoice" ("id", "subscription_id", "plan_code", "amount_cents", "currency", "period_started_at", "period_ends_at", "status", "issued_at")
       VALUES
         ('c1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'STARTER', 299000, 'RUB', NOW() - INTERVAL '400 days', NOW() - INTERVAL '370 days', 'VOIDED', NOW() - INTERVAL '400 days'),
         ('c2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 'STARTER', 299000, 'RUB', NOW() - INTERVAL '30 days', NOW(), 'VOIDED', NOW() - INTERVAL '30 days')`,
    );

    const retention = new RetentionCron(em);

    await retention.handleRetention();

    const rows = await conn.execute<Array<{ id: string }>>(
      'SELECT "id" FROM "bil_invoice" ORDER BY "issued_at"',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('c2222222-2222-4222-8222-222222222222');
  });

  it('deletes old published outbox events', async () => {
    const em = orm.em.fork();
    const conn = em.getConnection();

    await conn.execute(
      `INSERT INTO "outbox_events" ("id", "aggregate_id", "aggregate_type", "event_type", "payload", "occurred_at", "published_at", "retry_count")
       VALUES
         ('e1111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', 'Test', 'TestEvent', '{}', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', 0),
         ('e2222222-2222-4222-8222-222222222222', 'f2222222-2222-4222-8222-222222222222', 'Test', 'TestEvent', '{}', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 0)`,
    );

    const retention = new RetentionCron(em);

    await retention.handleRetention();

    const rows = await conn.execute<Array<{ id: string }>>('SELECT "id" FROM "outbox_events"');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('e2222222-2222-4222-8222-222222222222');
  });
});
