import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Email, type IUserRepository, Role, User, type UserId } from '@det/backend-iam-domain';
import { CLOCK, ID_GENERATOR, PhoneNumber } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { RegisterOwnerCommand } from './register-owner.command';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../../di/tokens';
import { PhoneAlreadyExistsError, UserAlreadyExistsError } from '../../errors/application.errors';

import type { IPasswordHasher } from '../../ports/password-hasher/password-hasher.port';

@CommandHandler(RegisterOwnerCommand)
export class RegisterOwnerHandler implements ICommandHandler<RegisterOwnerCommand, { id: UserId }> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: RegisterOwnerCommand): Promise<{ id: UserId }> {
    const email = Email.from(cmd.email);
    const phone = PhoneNumber.from(cmd.phone);

    if (await this.userRepo.existsByEmail(email)) {
      throw new UserAlreadyExistsError(email.getValue());
    }

    if (await this.userRepo.existsByPhone(phone)) {
      throw new PhoneAlreadyExistsError(phone.toString());
    }

    const passwordHash = await this.passwordHasher.hash(cmd.password);

    const user = User.register({
      branchIds: [],
      email,
      fullName: cmd.fullName,
      idGen: this.idGen,
      now: this.clock.now(),
      passwordHash,
      phone,
      role: Role.OWNER,
    });

    await this.userRepo.save(user);

    return { id: user.id };
  }
}
