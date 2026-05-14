import { PlanCode, SubscriptionStatus } from '@det/backend-billing-domain';
import { UserId } from '@det/shared-types';

import {
  FakeClock,
  FakeSubscriptionRepository,
  TENANT_ID,
  createActiveSubscription,
  createTrialSubscription,
} from './fakes';
import { ChangePlanCommand } from '../commands/change-plan/change-plan.command';
import { ChangePlanHandler } from '../commands/change-plan/change-plan.handler';
import { SubscriptionNotFoundError } from '../errors/application.errors';

const ACTOR = UserId.from('d0000000-0000-4000-a000-000000000001');

describe('ChangePlanHandler', () => {
  let handler: ChangePlanHandler;
  let subRepo: FakeSubscriptionRepository;

  beforeEach(() => {
    subRepo = new FakeSubscriptionRepository();
    handler = new ChangePlanHandler(subRepo, new FakeClock());
  });

  it('should change plan from STARTER to STANDARD', async () => {
    const sub = createActiveSubscription();

    subRepo.givenSubscription(sub);

    const result = await handler.execute(
      new ChangePlanCommand(TENANT_ID, PlanCode.STANDARD, ACTOR),
    );

    expect(result.id).toBe(sub.id);

    const saved = await subRepo.findByTenantId(TENANT_ID);
    const snap = saved?.toSnapshot();

    expect(snap?.planCode).toBe(PlanCode.STANDARD);
    expect(snap?.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('should throw SubscriptionNotFoundError when no subscription', async () => {
    await expect(
      handler.execute(new ChangePlanCommand(TENANT_ID, PlanCode.STANDARD, ACTOR)),
    ).rejects.toThrow(SubscriptionNotFoundError);
  });

  it('should throw when subscription is CANCELLED', async () => {
    const sub = createTrialSubscription();

    sub.cancel({ by: 'admin', reason: 'test', now: new FakeClock().now() });
    subRepo.givenSubscription(sub);

    await expect(
      handler.execute(new ChangePlanCommand(TENANT_ID, PlanCode.STANDARD, ACTOR)),
    ).rejects.toThrow();
  });
});
