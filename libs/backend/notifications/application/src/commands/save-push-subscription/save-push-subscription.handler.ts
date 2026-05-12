import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import type { IIdGenerator } from '@det/backend-shared-ddd';

import { SavePushSubscriptionCommand } from './save-push-subscription.command';
import { ID_GENERATOR, PUSH_SUBSCRIPTION_REPOSITORY } from '../../di/tokens';

import type { IPushSubscriptionRepository } from '../../ports/push-subscription.port';
import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(SavePushSubscriptionCommand)
export class SavePushSubscriptionHandler implements ICommandHandler<
  SavePushSubscriptionCommand,
  void
> {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly repo: IPushSubscriptionRepository,
    @Inject(ID_GENERATOR)
    private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: SavePushSubscriptionCommand): Promise<void> {
    const existing = await this.repo.findByEndpoint(cmd.endpoint);

    await this.repo.save({
      id: existing?.id ?? this.idGen.generate(),
      userId: cmd.userId,
      endpoint: cmd.endpoint,
      keys: cmd.keys,
      userAgent: cmd.userAgent,
      createdAt: existing?.createdAt ?? cmd.now.iso(),
    });
  }
}
