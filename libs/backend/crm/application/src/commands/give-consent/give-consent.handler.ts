import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository } from '@det/backend-crm-domain';
import { ClientId, ConsentType, PolicyVersion } from '@det/backend-crm-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { GiveConsentCommand } from './give-consent.command';
import { CLIENT_REPOSITORY, CLOCK, CRM_CONFIG_PORT } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

import type { ICrmConfigPort } from '../../ports/config.port';

@CommandHandler(GiveConsentCommand)
export class GiveConsentHandler implements ICommandHandler<GiveConsentCommand, void> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
    @Inject(CRM_CONFIG_PORT) private readonly _config: ICrmConfigPort,
  ) {}

  async execute(cmd: GiveConsentCommand): Promise<void> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    const version = cmd.policyVersion ?? this._config.getCurrentPolicyVersion();

    client.giveConsent(cmd.type as ConsentType, this._clock.now(), PolicyVersion.from(version));

    await this._clientRepo.save(client);
  }
}
