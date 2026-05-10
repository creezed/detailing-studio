import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository } from '@det/backend-crm-domain';
import { ClientId } from '@det/backend-crm-domain';
import type { IClock } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

import { AnonymizeClientCommand } from './anonymize-client.command';
import { ANONYMIZATION_REQUEST_PORT, CLIENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

import type { IAnonymizationRequestPort } from '../../ports/anonymization-request.port';

@CommandHandler(AnonymizeClientCommand)
export class AnonymizeClientHandler implements ICommandHandler<AnonymizeClientCommand, void> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(ANONYMIZATION_REQUEST_PORT) private readonly _anonPort: IAnonymizationRequestPort,
    @Inject(CLOCK) private readonly _clock: IClock,
  ) {}

  async execute(cmd: AnonymizeClientCommand): Promise<void> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    const now = this._clock.now();

    client.anonymize(cmd.by as UserId, cmd.reason, now);

    await this._clientRepo.save(client);

    if (cmd.anonymizationRequestId) {
      await this._anonPort.markCompleted(cmd.anonymizationRequestId, cmd.by, now.iso());
    }
  }
}
