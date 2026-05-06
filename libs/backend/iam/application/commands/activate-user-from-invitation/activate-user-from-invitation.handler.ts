import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  Email,
  InvitationStatus,
  User,
  type IInvitationRepository,
  type IUserRepository,
} from '@det/backend/iam/domain';
import { CLOCK, ID_GENERATOR, PhoneNumber } from '@det/backend/shared/ddd';
import type { IClock, IIdGenerator } from '@det/backend/shared/ddd';
import { BranchId } from '@det/shared/types';

import { ActivateUserFromInvitationCommand } from './activate-user-from-invitation.command';
import { INVITATION_REPOSITORY, PASSWORD_HASHER, USER_REPOSITORY } from '../../di/tokens';
import { InvitationNotFoundError, UserAlreadyExistsError } from '../../errors/application.errors';

import type { IPasswordHasher } from '../../ports/password-hasher/password-hasher.port';

@CommandHandler(ActivateUserFromInvitationCommand)
export class ActivateUserFromInvitationHandler implements ICommandHandler<
  ActivateUserFromInvitationCommand,
  void
> {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepo: IInvitationRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: ActivateUserFromInvitationCommand): Promise<void> {
    const invitation = await this.invitationRepo.findByRawToken(cmd.rawToken);

    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    const snapshot = invitation.toSnapshot();

    if (snapshot.status !== InvitationStatus.ACCEPTED) {
      throw new InvitationNotFoundError();
    }

    const email = Email.from(snapshot.email);
    const existingUser = await this.userRepo.existsByEmail(email);

    if (existingUser) {
      throw new UserAlreadyExistsError(snapshot.email);
    }

    const passwordHash = await this.passwordHasher.hash(cmd.password);

    await this.userRepo.save(
      User.activateFromInvitation({
        branchIds: snapshot.branchIds.map((branchId) => BranchId.from(branchId)),
        email,
        fullName: cmd.fullName,
        idGen: this.idGen,
        now: this.clock.now(),
        passwordHash,
        phone: PhoneNumber.from(cmd.phone),
        role: snapshot.role,
      }),
    );
  }
}
