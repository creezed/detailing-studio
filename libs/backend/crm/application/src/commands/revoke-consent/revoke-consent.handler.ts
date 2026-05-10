import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository } from '@det/backend-crm-domain';
import { ClientId, ConsentType } from '@det/backend-crm-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { RevokeConsentCommand } from './revoke-consent.command';
import { CLIENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { ClientNotFoundError, MustAnonymizeError } from '../../errors/application.errors';

@CommandHandler(RevokeConsentCommand)
export class RevokeConsentHandler implements ICommandHandler<RevokeConsentCommand, void> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
  ) {}

  async execute(cmd: RevokeConsentCommand): Promise<void> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    const consentType = cmd.type as ConsentType;

    if (consentType === ConsentType.PERSONAL_DATA_PROCESSING) {
      throw new MustAnonymizeError();
    }

    client.revokeConsent(consentType, this._clock.now());

    await this._clientRepo.save(client);
  }
}
