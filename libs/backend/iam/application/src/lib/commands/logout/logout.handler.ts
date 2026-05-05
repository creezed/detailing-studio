import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IRefreshSessionRepository } from '@det/backend/iam/domain';
import { CLOCK } from '@det/backend/shared/ddd';
import type { IClock } from '@det/backend/shared/ddd';

import { LogoutCommand } from './logout.command';
import { HASH_FN, REFRESH_SESSION_REPOSITORY } from '../../di/tokens';
import { SessionNotFoundError } from '../../errors/application.errors';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(
    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly sessionRepo: IRefreshSessionRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(HASH_FN) private readonly hashFn: (value: string) => string,
  ) {}

  async execute(cmd: LogoutCommand): Promise<void> {
    const tokenHash = this.hashFn(cmd.refreshToken);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (!session) {
      throw new SessionNotFoundError();
    }

    session.revoke(cmd.userId, this.clock.now());
    await this.sessionRepo.save(session);
  }
}
