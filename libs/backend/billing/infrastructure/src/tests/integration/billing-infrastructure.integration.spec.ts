import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { GenericContainer, Wait } from 'testcontainers';

import {
  Invoice,
  InvoiceStatus,
  PaymentRef,
  Period,
  PlanCode,
  Subscription,
  SubscriptionStatus,
} from '@det/backend-billing-domain';
import { DateTime, Money } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { OutboxEventSchema, OutboxService } from '@det/backend-shared-outbox';
import { InvoiceId, SubscriptionId, TenantId } from '@det/shared-types';

import { MockPaymentProviderAdapter } from '../../adapters/mock-payment-provider.adapter';
import { BilInvoiceSchema } from '../../persistence/bil-invoice.schema';
import { BilPlanSchema } from '../../persistence/bil-plan.schema';
import { BilSubscriptionSchema } from '../../persistence/bil-subscription.schema';
import { BilInvoiceRepository } from '../../repositories/bil-invoice.repository';
import { BilSubscriptionRepository } from '../../repositories/bil-subscription.repository';

import type { EntityManager } from '@mikro-orm/postgresql';
import type { StartedTestContainer } from 'testcontainers';

const SUB_ID = SubscriptionId.from('a1111111-1111-4111-8111-111111111111');
const TENANT_ID = TenantId.from('b1111111-1111-4111-8111-111111111111');
const INV_ID = InvoiceId.from('c1111111-1111-4111-8111-111111111111');
const INV_ID_2 = InvoiceId.from('c2222222-2222-4222-8222-222222222222');
const NOW = DateTime.from('2026-01-15T10:00:00.000Z');

const ALL_ENTITIES = [BilPlanSchema, BilSubscriptionSchema, BilInvoiceSchema, OutboxEventSchema];

function subRepo(em: EntityManager): BilSubscriptionRepository {
  return new BilSubscriptionRepository(em, new OutboxService());
}

function invRepo(em: EntityManager): BilInvoiceRepository {
  return new BilInvoiceRepository(em, new OutboxService());
}

function trialSubscription(): Subscription {
  return Subscription.startTrial({
    id: SUB_ID,
    tenantId: TENANT_ID,
    planCode: PlanCode.STARTER,
    now: NOW,
  });
}

function activeSubscription(): Subscription {
  return Subscription.startActive({
    id: SUB_ID,
    tenantId: TENANT_ID,
    planCode: PlanCode.STARTER,
    now: NOW,
  });
}

function issuedInvoice(invoiceId?: InvoiceId): Invoice {
  return Invoice.issue({
    id: invoiceId ?? INV_ID,
    subscriptionId: SUB_ID,
    planCode: PlanCode.STARTER,
    amount: Money.rub(2990),
    period: new Period(NOW, NOW.plusMonths(1)),
    now: NOW,
  });
}

let idCounter = 0;

class TestIdGenerator implements IIdGenerator {
  generate(): string {
    idCounter++;

    return `d0000000-0000-4000-a000-${String(idCounter).padStart(12, '0')}`;
  }
}

describe('Billing infrastructure integration', () => {
  let container: StartedTestContainer;
  let orm: MikroORM<PostgreSqlDriver>;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'bil_test',
        POSTGRES_PASSWORD: 'bil',
        POSTGRES_USER: 'bil',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    orm = await MikroORM.init<PostgreSqlDriver>({
      clientUrl: `postgres://bil:bil@${container.getHost()}:${String(container.getMappedPort(5432))}/bil_test`,
      driver: PostgreSqlDriver,
      entities: ALL_ENTITIES,
    });

    await orm.schema.createSchema();

    await orm.em.execute(
      `create unique index if not exists "uq_invoice_period"
        on "bil_invoice" ("subscription_id", "period_started_at", "period_ends_at");`,
    );
  }, 60_000);

  afterAll(async () => {
    await orm.close(true);
    await container.stop();
  });

  beforeEach(async () => {
    idCounter = 0;
    await orm.em.execute(
      'truncate table "outbox_events", "bil_invoice", "bil_subscription", "bil_plan" cascade',
    );
  });

  describe('BilSubscriptionRepository', () => {
    it('saves and restores a TRIAL subscription', async () => {
      const em = orm.em.fork();
      const sub = trialSubscription();

      sub.pullDomainEvents();
      await subRepo(em).save(sub);

      em.clear();
      const found = await subRepo(em).findById(SUB_ID);

      expect(found).not.toBeNull();
      expect(found?.toSnapshot().status).toBe(SubscriptionStatus.TRIAL);
      expect(found?.toSnapshot().tenantId).toBe(TENANT_ID);
      expect(found?.toSnapshot().planCode).toBe(PlanCode.STARTER);
    });

    it('saves and restores an ACTIVE subscription', async () => {
      const em = orm.em.fork();
      const sub = activeSubscription();

      sub.pullDomainEvents();
      await subRepo(em).save(sub);

      em.clear();
      const found = await subRepo(em).findById(SUB_ID);

      expect(found?.toSnapshot().status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('finds by tenantId', async () => {
      const em = orm.em.fork();
      const sub = trialSubscription();

      sub.pullDomainEvents();
      await subRepo(em).save(sub);

      em.clear();
      const found = await subRepo(em).findByTenantId(TENANT_ID);

      expect(found?.id).toBe(SUB_ID);
    });

    it('finds all by status', async () => {
      const em = orm.em.fork();
      const sub = activeSubscription();

      sub.pullDomainEvents();
      await subRepo(em).save(sub);

      em.clear();
      const found = await subRepo(em).findAllByStatus(SubscriptionStatus.ACTIVE, 10);

      expect(found).toHaveLength(1);
    });

    it('saves CANCELLED subscription', async () => {
      const em = orm.em.fork();
      const sub = activeSubscription();

      sub.pullDomainEvents();
      sub.cancel({ by: 'user', reason: 'test', now: NOW });
      await subRepo(em).save(sub);

      em.clear();
      const found = await subRepo(em).findById(SUB_ID);

      expect(found?.toSnapshot().status).toBe(SubscriptionStatus.CANCELLED);
      expect(found?.toSnapshot().cancelReason).toBe('test');
    });

    it('appends domain events to outbox', async () => {
      const em = orm.em.fork();
      const sub = trialSubscription();

      await subRepo(em).save(sub);

      const outboxCount = await em.count(OutboxEventSchema, {});

      expect(outboxCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('BilInvoiceRepository', () => {
    beforeEach(async () => {
      const em = orm.em.fork();
      const sub = activeSubscription();

      sub.pullDomainEvents();
      await subRepo(em).save(sub);
    });

    it('saves and restores an ISSUED invoice', async () => {
      const em = orm.em.fork();
      const inv = issuedInvoice();

      inv.pullDomainEvents();
      await invRepo(em).save(inv);

      em.clear();
      const found = await invRepo(em).findById(INV_ID);

      expect(found).not.toBeNull();
      expect(found?.toSnapshot().status).toBe(InvoiceStatus.ISSUED);
      expect(found?.toSnapshot().planCode).toBe(PlanCode.STARTER);
      expect(Number(found?.toSnapshot().amount.cents)).toBe(299000);
    });

    it('finds by subscriptionId', async () => {
      const em = orm.em.fork();
      const inv = issuedInvoice();

      inv.pullDomainEvents();
      await invRepo(em).save(inv);

      em.clear();
      const found = await invRepo(em).findBySubscriptionId(SUB_ID);

      expect(found).toHaveLength(1);
    });

    it('finds unpaid invoices', async () => {
      const em = orm.em.fork();
      const inv = issuedInvoice();

      inv.pullDomainEvents();
      await invRepo(em).save(inv);

      em.clear();
      const unpaid = await invRepo(em).findUnpaidBySubscription(SUB_ID);

      expect(unpaid).toHaveLength(1);
    });

    it('saves PAID invoice with paymentRef', async () => {
      const em = orm.em.fork();
      const inv = issuedInvoice();

      inv.pullDomainEvents();
      inv.markPaid({ paymentRef: PaymentRef.from('pay_ref_123'), now: NOW });
      await invRepo(em).save(inv);

      em.clear();
      const found = await invRepo(em).findById(INV_ID);

      expect(found?.toSnapshot().status).toBe(InvoiceStatus.PAID);
      expect(found?.toSnapshot().paymentRef).toBe('pay_ref_123');
    });

    it('enforces unique constraint on same period', async () => {
      const em = orm.em.fork();
      const inv1 = issuedInvoice(INV_ID);

      inv1.pullDomainEvents();
      await invRepo(em).save(inv1);

      const em2 = orm.em.fork();
      const inv2 = issuedInvoice(INV_ID_2);

      inv2.pullDomainEvents();

      await expect(invRepo(em2).save(inv2)).rejects.toThrow();
    });

    it('appends domain events to outbox', async () => {
      const em = orm.em.fork();
      const inv = issuedInvoice();

      await invRepo(em).save(inv);

      const outboxCount = await em.count(OutboxEventSchema, {});

      expect(outboxCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('MockPaymentProviderAdapter', () => {
    it('createPayment returns valid paymentRef', async () => {
      const adapter = new MockPaymentProviderAdapter(new TestIdGenerator());

      const result = await adapter.createPayment({
        amount: Money.rub(2990),
        description: 'Test payment',
        idempotencyKey: 'key_1',
      });

      expect(result.paymentRef).toBeDefined();
      expect((result.paymentRef as string).startsWith('mock_')).toBe(true);
      expect(result.redirectUrl).toBeNull();
    });

    it('checkStatus returns SUCCEEDED for mock refs', async () => {
      const adapter = new MockPaymentProviderAdapter(new TestIdGenerator());

      const { paymentRef } = await adapter.createPayment({
        amount: Money.rub(1000),
        description: 'Test',
        idempotencyKey: 'key_2',
      });

      const status = await adapter.checkStatus(paymentRef);

      expect(status.status).toBe('SUCCEEDED');
      expect(status.provider).toBe('mock');
    });

    it('checkStatus returns FAILED for mock_fail_ refs', async () => {
      const adapter = new MockPaymentProviderAdapter(new TestIdGenerator());
      const failRef = PaymentRef.from('mock_fail_test');

      const status = await adapter.checkStatus(failRef);

      expect(status.status).toBe('FAILED');
      expect(status.provider).toBe('mock');
    });
  });
});
