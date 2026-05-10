import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository, UpdateProfileProps } from '@det/backend-crm-domain';
import { ClientId, Email, FullName, PhoneNumber } from '@det/backend-crm-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { UpdateClientProfileCommand } from './update-client-profile.command';
import { CLIENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateClientProfileCommand)
export class UpdateClientProfileHandler implements ICommandHandler<
  UpdateClientProfileCommand,
  void
> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
  ) {}

  async execute(cmd: UpdateClientProfileCommand): Promise<void> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    const props: UpdateProfileProps = {};

    if (cmd.lastName !== undefined && cmd.firstName !== undefined) {
      (props as Record<string, unknown>)['fullName'] = FullName.create(
        cmd.lastName,
        cmd.firstName,
        cmd.middleName,
      );
    }

    if (cmd.phone !== undefined) {
      (props as Record<string, unknown>)['phone'] = PhoneNumber.from(cmd.phone);
    }

    if (cmd.email !== undefined) {
      (props as Record<string, unknown>)['email'] =
        cmd.email !== null ? Email.from(cmd.email) : null;
    }

    if (cmd.birthDate !== undefined) {
      (props as Record<string, unknown>)['birthDate'] =
        cmd.birthDate !== null ? new Date(cmd.birthDate) : null;
    }

    if (cmd.source !== undefined) {
      (props as Record<string, unknown>)['source'] = cmd.source !== null ? cmd.source : null;
    }

    if (cmd.comment !== undefined) {
      (props as Record<string, unknown>)['comment'] = cmd.comment;
    }

    client.updateProfile(props, this._clock.now());

    await this._clientRepo.save(client);
  }
}
