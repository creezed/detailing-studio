import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { PasswordHash, type IUserRepository } from '@det/backend-iam-domain';
import { CLOCK } from '@det/backend-shared-ddd';
import type { IClock } from '@det/backend-shared-ddd';

import { ChangePasswordCommand } from './change-password.command';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../../di/tokens';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/application.errors';

import type { IPasswordHasher } from '../../ports/password-hasher/password-hasher.port';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepo.findById(cmd.userId);

    if (!user) {
      throw new UserNotFoundError(cmd.userId);
    }

    const snapshot = user.toSnapshot();

    if (snapshot.passwordHash === null) {
      throw new InvalidPasswordError();
    }

    const oldHash = PasswordHash.fromHash(snapshot.passwordHash);
    const valid = await this.passwordHasher.verify(cmd.oldPassword, oldHash);

    if (!valid) {
      throw new InvalidPasswordError();
    }

    const newHash = await this.passwordHasher.hash(cmd.newPassword);

    user.changePassword(newHash, this.clock.now());

    await this.userRepo.save(user);
  }
}
