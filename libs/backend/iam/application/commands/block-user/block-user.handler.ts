import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Role, type IUserRepository } from '@det/backend/iam/domain';
import { CLOCK } from '@det/backend/shared/ddd';
import type { IClock } from '@det/backend/shared/ddd';

import { BlockUserCommand } from './block-user.command';
import { USER_REPOSITORY } from '../../di/tokens';
import { UserNotFoundError } from '../../errors/application.errors';

@CommandHandler(BlockUserCommand)
export class BlockUserHandler implements ICommandHandler<BlockUserCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: BlockUserCommand): Promise<void> {
    const user = await this.userRepo.findById(cmd.userId);

    if (!user) {
      throw new UserNotFoundError(cmd.userId);
    }

    const isLastOwner = user.hasRole(Role.OWNER) && (await this.userRepo.countOwners()) <= 1;

    user.blockWithOwnerGuard(cmd.actorId, cmd.reason, this.clock.now(), isLastOwner);

    await this.userRepo.save(user);
  }
}
