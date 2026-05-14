import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { ISubscriptionRepository } from '@det/backend-billing-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { CancelSubscriptionCommand } from './cancel-subscription.command';
import { CLOCK, SUBSCRIPTION_REPOSITORY } from '../../di/tokens';
import { SubscriptionNotFoundError } from '../../errors/application.errors';

@CommandHandler(CancelSubscriptionCommand)
export class CancelSubscriptionHandler implements ICommandHandler<CancelSubscriptionCommand, void> {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly repo: ISubscriptionRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: CancelSubscriptionCommand): Promise<void> {
    const sub = await this.repo.findByTenantId(cmd.tenantId);

    if (!sub) {
      throw new SubscriptionNotFoundError(cmd.tenantId);
    }

    sub.cancel({ by: cmd.by, reason: cmd.reason, now: this.clock.now() });
    await this.repo.save(sub);
  }
}
