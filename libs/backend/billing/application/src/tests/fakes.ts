import {
  Invoice,
  InvoiceStatus,
  PaymentRef,
  Period,
  PlanCode,
  Subscription,
} from '@det/backend-billing-domain';
import type {
  ISubscriptionRepository,
  IInvoiceRepository,
  LimitsUsage,
  SubscriptionStatus,
} from '@det/backend-billing-domain';
import { DateTime, Money } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { InvoiceId, SubscriptionId, TenantId } from '@det/shared-types';

import type { IBillingConfigPort } from '../ports/billing-config.port';
import type { ILimitsUsagePort } from '../ports/limits-usage.port';
import type {
  IPaymentProviderPort,
  PaymentStatus,
  PaymentProvider,
} from '../ports/payment-provider.port';

export const NOW = DateTime.from('2026-01-15T10:00:00.000Z');
export const TENANT_ID = TenantId.from('a0000000-0000-4000-a000-000000000001');

export class FakeSubscriptionRepository implements ISubscriptionRepository {
  private readonly store = new Map<string, Subscription>();

  findById(id: SubscriptionId): Promise<Subscription | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByTenantId(tenantId: TenantId): Promise<Subscription | null> {
    for (const sub of this.store.values()) {
      if (sub.toSnapshot().tenantId === tenantId) {
        return Promise.resolve(sub);
      }
    }

    return Promise.resolve(null);
  }

  findAllByStatus(status: SubscriptionStatus, limit: number): Promise<readonly Subscription[]> {
    const result: Subscription[] = [];

    for (const sub of this.store.values()) {
      if (sub.toSnapshot().status === status && result.length < limit) {
        result.push(sub);
      }
    }

    return Promise.resolve(result);
  }

  save(subscription: Subscription): Promise<void> {
    const snap = subscription.toSnapshot();

    this.store.set(snap.id, Subscription.restore(snap));

    return Promise.resolve();
  }

  givenSubscription(sub: Subscription): void {
    const snap = sub.toSnapshot();

    this.store.set(snap.id, Subscription.restore(snap));
  }
}

export class FakeInvoiceRepository implements IInvoiceRepository {
  private readonly store = new Map<string, Invoice>();

  findById(id: InvoiceId): Promise<Invoice | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findBySubscriptionId(subscriptionId: SubscriptionId): Promise<readonly Invoice[]> {
    const result: Invoice[] = [];

    for (const inv of this.store.values()) {
      if (inv.toSnapshot().subscriptionId === subscriptionId) {
        result.push(inv);
      }
    }

    return Promise.resolve(result);
  }

  async findUnpaidBySubscription(subscriptionId: SubscriptionId): Promise<readonly Invoice[]> {
    const all = await this.findBySubscriptionId(subscriptionId);

    return all.filter((inv) => inv.toSnapshot().status === InvoiceStatus.ISSUED);
  }

  save(invoice: Invoice): Promise<void> {
    const snap = invoice.toSnapshot();

    this.store.set(snap.id, Invoice.restore(snap));

    return Promise.resolve();
  }

  givenInvoice(inv: Invoice): void {
    const snap = inv.toSnapshot();

    this.store.set(snap.id, Invoice.restore(snap));
  }
}

export class FakeClock implements IClock {
  constructor(private _now: DateTime = NOW) {}

  now(): DateTime {
    return this._now;
  }

  setNow(dt: DateTime): void {
    this._now = dt;
  }
}

let idCounter = 0;

export class FakeIdGenerator implements IIdGenerator {
  generate(): string {
    idCounter++;

    return `f0000000-0000-4000-a000-${String(idCounter).padStart(12, '0')}`;
  }
}

export class FakePaymentProvider implements IPaymentProviderPort {
  readonly payments = new Map<string, { amount: Money; status: PaymentStatus }>();

  createPayment(input: {
    amount: Money;
    description: string;
    idempotencyKey: string;
  }): Promise<{ paymentRef: PaymentRef; redirectUrl: string | null }> {
    const ref = PaymentRef.from(`mock_${input.idempotencyKey}`);

    this.payments.set(ref, { amount: input.amount, status: 'SUCCEEDED' });

    return Promise.resolve({ paymentRef: ref, redirectUrl: null });
  }

  checkStatus(
    paymentRef: PaymentRef,
  ): Promise<{ status: PaymentStatus; provider: PaymentProvider }> {
    const p = this.payments.get(paymentRef);

    return Promise.resolve({ status: p?.status ?? 'PENDING', provider: 'mock' });
  }
}

export class FakeLimitsUsagePort implements ILimitsUsagePort {
  private _usage: LimitsUsage = {
    branchesUsed: 1,
    mastersUsed: 2,
    appointmentsThisMonthUsed: 50,
    periodStart: NOW,
    periodEnd: NOW.plusMonths(1),
  };

  getUsage(): Promise<LimitsUsage> {
    return Promise.resolve(this._usage);
  }

  setUsage(usage: LimitsUsage): void {
    this._usage = usage;
  }
}

export class FakeBillingConfig implements IBillingConfigPort {
  demoBillingAutoPay = true;
}

export function createTrialSubscription(
  id?: SubscriptionId,
  tenantId?: TenantId,
  now?: DateTime,
): Subscription {
  return Subscription.startTrial({
    id: id ?? SubscriptionId.from('b0000000-0000-4000-a000-000000000001'),
    tenantId: tenantId ?? TENANT_ID,
    planCode: PlanCode.STARTER,
    now: now ?? NOW,
  });
}

export function createActiveSubscription(
  id?: SubscriptionId,
  tenantId?: TenantId,
  now?: DateTime,
): Subscription {
  return Subscription.startActive({
    id: id ?? SubscriptionId.from('b0000000-0000-4000-a000-000000000001'),
    tenantId: tenantId ?? TENANT_ID,
    planCode: PlanCode.STARTER,
    now: now ?? NOW,
  });
}

export function createIssuedInvoice(
  subscriptionId: SubscriptionId,
  invoiceId?: InvoiceId,
  now?: DateTime,
): Invoice {
  const n = now ?? NOW;

  return Invoice.issue({
    id: invoiceId ?? InvoiceId.from('c0000000-0000-4000-a000-000000000001'),
    subscriptionId,
    planCode: PlanCode.STARTER,
    amount: Money.rub(2990),
    period: new Period(n, n.plusMonths(1)),
    now: n,
  });
}

export function resetIdCounter(): void {
  idCounter = 0;
}
