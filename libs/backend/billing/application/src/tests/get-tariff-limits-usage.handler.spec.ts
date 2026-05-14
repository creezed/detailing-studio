import { PlanCode } from '@det/backend-billing-domain';
import { DateTime } from '@det/backend-shared-ddd';

import {
  FakeClock,
  FakeLimitsUsagePort,
  FakeSubscriptionRepository,
  NOW,
  TENANT_ID,
  createActiveSubscription,
} from './fakes';
import { SubscriptionNotFoundError } from '../errors/application.errors';
import { GetTariffLimitsUsageHandler } from '../queries/get-tariff-limits-usage/get-tariff-limits-usage.handler';
import { GetTariffLimitsUsageQuery } from '../queries/get-tariff-limits-usage/get-tariff-limits-usage.query';

describe('GetTariffLimitsUsageHandler', () => {
  let handler: GetTariffLimitsUsageHandler;
  let subRepo: FakeSubscriptionRepository;
  let limitsUsagePort: FakeLimitsUsagePort;

  beforeEach(() => {
    subRepo = new FakeSubscriptionRepository();
    limitsUsagePort = new FakeLimitsUsagePort();
    handler = new GetTariffLimitsUsageHandler(subRepo, limitsUsagePort, new FakeClock());
  });

  it('should throw SubscriptionNotFoundError when no subscription', async () => {
    await expect(handler.execute(new GetTariffLimitsUsageQuery(TENANT_ID))).rejects.toThrow(
      SubscriptionNotFoundError,
    );
  });

  it('should return EXCEEDED report for STARTER with 2 branches used', async () => {
    const sub = createActiveSubscription();

    subRepo.givenSubscription(sub);

    limitsUsagePort.setUsage({
      branchesUsed: 2,
      mastersUsed: 3,
      appointmentsThisMonthUsed: 200,
      periodStart: NOW,
      periodEnd: NOW.plusMonths(1),
    });

    const report = await handler.execute(new GetTariffLimitsUsageQuery(TENANT_ID));

    expect(report.plan).toBe(PlanCode.STARTER);
    expect(report.status).toBe('EXCEEDED');

    const branchItem = report.items.find((i) => i.field === 'branches');

    expect(branchItem?.status).toBe('EXCEEDED');
    expect(branchItem?.used).toBe(2);
    expect(branchItem?.limit).toBe(1);
  });

  it('should return OK report for PRO plan regardless of usage', async () => {
    const sub = createActiveSubscription();

    sub.changePlan({ newPlanCode: PlanCode.PRO, now: DateTime.from('2026-01-15T10:00:00.000Z') });
    subRepo.givenSubscription(sub);

    limitsUsagePort.setUsage({
      branchesUsed: 100,
      mastersUsed: 500,
      appointmentsThisMonthUsed: 99999,
      periodStart: NOW,
      periodEnd: NOW.plusMonths(1),
    });

    const report = await handler.execute(new GetTariffLimitsUsageQuery(TENANT_ID));

    expect(report.plan).toBe(PlanCode.PRO);
    expect(report.status).toBe('OK');
  });
});
