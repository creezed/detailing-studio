import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository } from '@det/backend-crm-domain';
import { ClientId } from '@det/backend-crm-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { UpgradeClientToRegularCommand } from './upgrade-client-to-regular.command';
import { CLIENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpgradeClientToRegularCommand)
export class UpgradeClientToRegularHandler implements ICommandHandler<
  UpgradeClientToRegularCommand,
  void
> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
  ) {}

  async execute(cmd: UpgradeClientToRegularCommand): Promise<void> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    client.upgradeToRegular(this._clock.now());

    await this._clientRepo.save(client);
  }
}
