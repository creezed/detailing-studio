import { GenerateMonthlyInvoiceCommand } from '@det/backend-billing-application';
import type { ITenantContextPort } from '@det/backend-billing-application';
import { PlanCode, Subscription } from '@det/backend-billing-domain';
import type { ISubscriptionRepository } from '@det/backend-billing-domain';
import { DateTime } from '@det/backend-shared-ddd';
import { SubscriptionId, TenantId } from '@det/shared-types';

import { CatchUpInvoicesCron } from '../lib/catch-up-invoices.cron';
import { MonthlyInvoiceProcessor } from '../lib/monthly-invoice.processor';

const TENANT_1 = TenantId.from('a1111111-1111-4111-8111-111111111111');
const TENANT_2 = TenantId.from('a2222222-2222-4222-8222-222222222222');
const SUB_1 = SubscriptionId.from('b1111111-1111-4111-8111-111111111111');
const NOW = DateTime.from('2026-02-01T00:00:00.000Z');

function mockTenants(...ids: TenantId[]): ITenantContextPort {
  return {
    getAll: () => Promise.resolve(ids),
    getCurrent: () => ids[0] ?? TENANT_1,
  };
}

describe('MonthlyInvoiceProcessor', () => {
  it('calls GenerateMonthlyInvoiceCommand for each tenant', async () => {
    const executedCommands: GenerateMonthlyInvoiceCommand[] = [];
    const commandBus = {
      execute: (cmd: unknown) => {
        if (cmd instanceof GenerateMonthlyInvoiceCommand) {
          executedCommands.push(cmd);
        }

        return Promise.resolve();
      },
    };

    const tenants = mockTenants(TENANT_1, TENANT_2);
    const processor = new MonthlyInvoiceProcessor(commandBus as never, tenants);

    await processor.process({ name: 'monthly-invoice' } as never);

    expect(executedCommands).toHaveLength(2);
    expect(executedCommands[0]?.tenantId).toBe(TENANT_1);
    expect(executedCommands[1]?.tenantId).toBe(TENANT_2);
  });

  it('skips jobs with unknown name', async () => {
    const executedCommands: unknown[] = [];
    const commandBus = {
      execute: (cmd: unknown) => {
        executedCommands.push(cmd);

        return Promise.resolve();
      },
    };

    const tenants = mockTenants(TENANT_1);
    const processor = new MonthlyInvoiceProcessor(commandBus as never, tenants);

    await processor.process({ name: 'unknown-job' } as never);

    expect(executedCommands).toHaveLength(0);
  });

  it('continues to next tenant if one fails', async () => {
    const executedIds: TenantId[] = [];
    const badTenant = TenantId.from('c9999999-9999-4999-8999-999999999999');

    const commandBus = {
      execute: (cmd: unknown) => {
        if (cmd instanceof GenerateMonthlyInvoiceCommand) {
          if (cmd.tenantId === badTenant) {
            return Promise.reject(new Error('Subscription not found'));
          }
          executedIds.push(cmd.tenantId);
        }

        return Promise.resolve();
      },
    };

    const tenants = mockTenants(badTenant, TENANT_1);
    const processor = new MonthlyInvoiceProcessor(commandBus as never, tenants);

    await processor.process({ name: 'monthly-invoice' } as never);

    expect(executedIds).toEqual([TENANT_1]);
  });
});

describe('CatchUpInvoicesCron', () => {
  function activeSub(): Subscription {
    const sub = Subscription.startActive({
      id: SUB_1,
      now: DateTime.from('2025-12-01T00:00:00.000Z'),
      planCode: PlanCode.STARTER,
      tenantId: TENANT_1,
    });

    sub.pullDomainEvents();

    return sub;
  }

  it('generates invoice when nextBillingAt is in the past', async () => {
    const sub = activeSub();
    const executedCommands: GenerateMonthlyInvoiceCommand[] = [];

    const commandBus = {
      execute: (cmd: unknown) => {
        if (cmd instanceof GenerateMonthlyInvoiceCommand) {
          executedCommands.push(cmd);
        }

        return Promise.resolve();
      },
    };

    const subRepo: Partial<ISubscriptionRepository> = {
      findByTenantId: () => Promise.resolve(sub),
    };

    const tenants = mockTenants(TENANT_1);
    const clock = { now: () => NOW };

    const cron = new CatchUpInvoicesCron(
      commandBus as never,
      tenants,
      subRepo as ISubscriptionRepository,
      clock,
    );

    await cron.catchUp();

    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0]?.tenantId).toBe(TENANT_1);
  });

  it('does not generate invoice when nextBillingAt is in the future', async () => {
    const sub = Subscription.startActive({
      id: SUB_1,
      now: DateTime.from('2026-01-25T00:00:00.000Z'),
      planCode: PlanCode.STARTER,
      tenantId: TENANT_1,
    });

    sub.pullDomainEvents();

    const executedCommands: unknown[] = [];
    const commandBus = {
      execute: (cmd: unknown) => {
        executedCommands.push(cmd);

        return Promise.resolve();
      },
    };

    const subRepo: Partial<ISubscriptionRepository> = {
      findByTenantId: () => Promise.resolve(sub),
    };

    const tenants = mockTenants(TENANT_1);
    const clock = { now: () => NOW };

    const cron = new CatchUpInvoicesCron(
      commandBus as never,
      tenants,
      subRepo as ISubscriptionRepository,
      clock,
    );

    await cron.catchUp();

    expect(executedCommands).toHaveLength(0);
  });

  it('skips tenant with CANCELLED subscription', async () => {
    const sub = Subscription.startActive({
      id: SUB_1,
      now: DateTime.from('2025-12-01T00:00:00.000Z'),
      planCode: PlanCode.STARTER,
      tenantId: TENANT_1,
    });

    sub.pullDomainEvents();
    sub.cancel({ by: 'user', now: DateTime.from('2026-01-10T00:00:00.000Z'), reason: 'test' });

    const executedCommands: unknown[] = [];
    const commandBus = {
      execute: (cmd: unknown) => {
        executedCommands.push(cmd);

        return Promise.resolve();
      },
    };

    const subRepo: Partial<ISubscriptionRepository> = {
      findByTenantId: () => Promise.resolve(sub),
    };

    const tenants = mockTenants(TENANT_1);
    const clock = { now: () => NOW };

    const cron = new CatchUpInvoicesCron(
      commandBus as never,
      tenants,
      subRepo as ISubscriptionRepository,
      clock,
    );

    await cron.catchUp();

    expect(executedCommands).toHaveLength(0);
  });
});
