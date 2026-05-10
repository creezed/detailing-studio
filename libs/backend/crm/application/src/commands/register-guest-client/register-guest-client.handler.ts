import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { ClientId, IClientRepository } from '@det/backend-crm-domain';
import {
  Client,
  ConsentSet,
  Email,
  FullName,
  PhoneNumber,
  PolicyVersion,
} from '@det/backend-crm-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { RegisterGuestClientCommand } from './register-guest-client.command';
import { CLIENT_REPOSITORY, CLOCK, ID_GENERATOR } from '../../di/tokens';
import { DuplicatePhoneError } from '../../errors/application.errors';

@CommandHandler(RegisterGuestClientCommand)
export class RegisterGuestClientHandler implements ICommandHandler<
  RegisterGuestClientCommand,
  { id: ClientId }
> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
    @Inject(ID_GENERATOR) private readonly _idGen: IIdGenerator,
  ) {}

  async execute(cmd: RegisterGuestClientCommand): Promise<{ id: ClientId }> {
    const phone = PhoneNumber.from(cmd.phone);

    const existing = await this._clientRepo.findByPhone(phone);

    if (existing) {
      throw new DuplicatePhoneError(cmd.phone);
    }

    const now = this._clock.now();

    let consents = ConsentSet.empty();

    for (const c of cmd.consents) {
      consents = consents.give(c.type, now.toDate(), PolicyVersion.from(c.policyVersion));
    }

    const client = Client.registerGuest({
      fullName: FullName.create(cmd.lastName, cmd.firstName, cmd.middleName),
      phone,
      email: cmd.email !== null ? Email.from(cmd.email) : null,
      birthDate: cmd.birthDate !== null ? new Date(cmd.birthDate) : null,
      source: cmd.source as Parameters<typeof Client.registerGuest>[0]['source'],
      comment: cmd.comment,
      consents,
      idGen: this._idGen,
      now,
    });

    await this._clientRepo.save(client);

    return { id: client.id };
  }
}
