import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { ISubscriptionRepository } from '@det/backend-billing-domain';
import { PlanCode, Subscription } from '@det/backend-billing-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { SubscriptionId } from '@det/shared-types';

import { StartTrialCommand } from './start-trial.command';
import { CLOCK, ID_GENERATOR, SUBSCRIPTION_REPOSITORY } from '../../di/tokens';
import { TenantAlreadyHasSubscriptionError } from '../../errors/application.errors';

@CommandHandler(StartTrialCommand)
export class StartTrialHandler implements ICommandHandler<
  StartTrialCommand,
  { id: SubscriptionId }
> {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly repo: ISubscriptionRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: StartTrialCommand): Promise<{ id: SubscriptionId }> {
    const existing = await this.repo.findByTenantId(cmd.tenantId);

    if (existing) {
      throw new TenantAlreadyHasSubscriptionError(cmd.tenantId);
    }

    const sub = Subscription.startTrial({
      id: SubscriptionId.from(this.idGen.generate()),
      tenantId: cmd.tenantId,
      planCode: PlanCode.STARTER,
      now: this.clock.now(),
    });

    await this.repo.save(sub);

    return { id: sub.id };
  }
}
