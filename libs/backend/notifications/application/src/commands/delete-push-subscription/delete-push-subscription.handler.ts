import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { DeletePushSubscriptionCommand } from './delete-push-subscription.command';
import { PUSH_SUBSCRIPTION_REPOSITORY } from '../../di/tokens';
import { PushSubscriptionNotFoundError } from '../../errors/application.errors';

import type { IPushSubscriptionRepository } from '../../ports/push-subscription.port';
import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(DeletePushSubscriptionCommand)
export class DeletePushSubscriptionHandler implements ICommandHandler<
  DeletePushSubscriptionCommand,
  void
> {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly repo: IPushSubscriptionRepository,
  ) {}

  async execute(cmd: DeletePushSubscriptionCommand): Promise<void> {
    const deleted = await this.repo.deleteById(cmd.subscriptionId, cmd.userId);

    if (!deleted) {
      throw new PushSubscriptionNotFoundError(cmd.subscriptionId);
    }
  }
}
