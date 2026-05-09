import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IInvitationRepository } from '@det/backend-iam-domain';
import { CLOCK, PhoneNumber } from '@det/backend-shared-ddd';
import type { IClock } from '@det/backend-shared-ddd';

import { AcceptInvitationCommand } from './accept-invitation.command';
import { INVITATION_REPOSITORY, PASSWORD_HASHER } from '../../di/tokens';
import { InvitationNotFoundError } from '../../errors/application.errors';

import type { IPasswordHasher } from '../../ports/password-hasher/password-hasher.port';

@CommandHandler(AcceptInvitationCommand)
export class AcceptInvitationHandler implements ICommandHandler<AcceptInvitationCommand, void> {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepo: IInvitationRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: AcceptInvitationCommand): Promise<void> {
    const invitation = await this.invitationRepo.findByRawToken(cmd.rawToken);

    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    const now = this.clock.now();
    const passwordHash = await this.passwordHasher.hash(cmd.password);

    invitation.accept({
      fullName: cmd.fullName,
      now,
      passwordHash,
      phone: PhoneNumber.from(cmd.phone),
      rawToken: cmd.rawToken,
    });

    await this.invitationRepo.save(invitation);
  }
}
