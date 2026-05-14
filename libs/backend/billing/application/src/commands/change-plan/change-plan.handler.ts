import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { ISubscriptionRepository } from '@det/backend-billing-domain';
import type { IClock } from '@det/backend-shared-ddd';
import type { SubscriptionId } from '@det/shared-types';

import { ChangePlanCommand } from './change-plan.command';
import { CLOCK, SUBSCRIPTION_REPOSITORY } from '../../di/tokens';
import { SubscriptionNotFoundError } from '../../errors/application.errors';

@CommandHandler(ChangePlanCommand)
export class ChangePlanHandler implements ICommandHandler<
  ChangePlanCommand,
  { id: SubscriptionId }
> {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly repo: ISubscriptionRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: ChangePlanCommand): Promise<{ id: SubscriptionId }> {
    const sub = await this.repo.findByTenantId(cmd.tenantId);

    if (!sub) {
      throw new SubscriptionNotFoundError(cmd.tenantId);
    }

    sub.changePlan({ newPlanCode: cmd.newPlanCode, now: this.clock.now() });
    await this.repo.save(sub);

    return { id: sub.id };
  }
}
