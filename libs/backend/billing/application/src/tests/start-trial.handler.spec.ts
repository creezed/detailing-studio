import { SubscriptionStatus } from '@det/backend-billing-domain';

import {
  FakeClock,
  FakeIdGenerator,
  FakeSubscriptionRepository,
  TENANT_ID,
  createTrialSubscription,
  resetIdCounter,
} from './fakes';
import { StartTrialCommand } from '../commands/start-trial/start-trial.command';
import { StartTrialHandler } from '../commands/start-trial/start-trial.handler';
import { TenantAlreadyHasSubscriptionError } from '../errors/application.errors';

describe('StartTrialHandler', () => {
  let handler: StartTrialHandler;
  let subRepo: FakeSubscriptionRepository;
  let clock: FakeClock;

  beforeEach(() => {
    resetIdCounter();
    subRepo = new FakeSubscriptionRepository();
    clock = new FakeClock();
    handler = new StartTrialHandler(subRepo, clock, new FakeIdGenerator());
  });

  it('should create a TRIAL subscription when tenant has none', async () => {
    const result = await handler.execute(new StartTrialCommand(TENANT_ID));

    expect(result.id).toBeDefined();

    const saved = await subRepo.findByTenantId(TENANT_ID);
    const snap = saved?.toSnapshot();

    expect(snap?.status).toBe(SubscriptionStatus.TRIAL);
    expect(snap?.planCode).toBe('STARTER');
  });

  it('should throw TenantAlreadyHasSubscriptionError when tenant already has a subscription', async () => {
    const existing = createTrialSubscription();

    subRepo.givenSubscription(existing);

    await expect(handler.execute(new StartTrialCommand(TENANT_ID))).rejects.toThrow(
      TenantAlreadyHasSubscriptionError,
    );
  });
});
