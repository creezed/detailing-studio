import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  UserId,
  UserStatus,
  type IRefreshSessionRepository,
  type IUserRepository,
} from '@det/backend/iam/domain';
import { CLOCK } from '@det/backend/shared/ddd';
import type { IClock } from '@det/backend/shared/ddd';

import { RefreshTokensCommand } from './refresh-tokens.command';
import {
  HASH_FN,
  REFRESH_SESSION_REPOSITORY,
  TOKEN_GENERATOR,
  USER_REPOSITORY,
} from '../../di/tokens';
import {
  InvalidCredentialsError,
  RefreshTokenReuseError,
  SessionExpiredError,
  SessionNotFoundError,
} from '../../errors/application.errors';
import { JWT_ISSUER } from '../../ports/jwt-issuer/jwt-issuer.port';
import { buildLoginResponse } from '../shared/build-login-response';

import type { LoginResponseDto } from '../../dto/login-response/login-response.dto';
import type { IJwtIssuer } from '../../ports/jwt-issuer/jwt-issuer.port';
import type { ITokenGenerator } from '../../ports/token-generator/token-generator.port';

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<
  RefreshTokensCommand,
  LoginResponseDto
> {
  constructor(
    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly sessionRepo: IRefreshSessionRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokenGen: ITokenGenerator,
    @Inject(JWT_ISSUER) private readonly jwtIssuer: IJwtIssuer,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(HASH_FN) private readonly hashFn: (value: string) => string,
  ) {}

  async execute(cmd: RefreshTokensCommand): Promise<LoginResponseDto> {
    const now = this.clock.now();
    const currentTokenHash = this.hashFn(cmd.currentRefreshToken);

    const session = await this.sessionRepo.findByTokenHash(currentTokenHash);

    if (session) {
      if (session.isExpired(now)) {
        throw new SessionExpiredError(session.id);
      }

      const newRefreshToken = this.tokenGen.generateRefreshToken();

      session.rotate(now, newRefreshToken.hash);
      await this.sessionRepo.save(session);

      return this.buildResponse(session.toSnapshot().userId, newRefreshToken.raw);
    }

    const compromisedSession = await this.sessionRepo.findByRotatedTokenHash(currentTokenHash);

    if (compromisedSession) {
      const userId = compromisedSession.toSnapshot().userId;
      compromisedSession.markCompromised(now);
      await this.sessionRepo.save(compromisedSession);
      const activeSessions = await this.sessionRepo.listActiveByUserId(UserId.from(userId));

      for (const sessionToBlock of activeSessions) {
        sessionToBlock.markCompromised(now);
        await this.sessionRepo.save(sessionToBlock);
      }

      throw new RefreshTokenReuseError(compromisedSession.id);
    }

    throw new SessionNotFoundError();
  }

  private async buildResponse(userId: string, refreshToken: string): Promise<LoginResponseDto> {
    const user = await this.userRepo.findById(UserId.from(userId));

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const snapshot = user.toSnapshot();

    if (snapshot.status !== UserStatus.ACTIVE) {
      throw new InvalidCredentialsError();
    }

    return buildLoginResponse({
      jwtIssuer: this.jwtIssuer,
      refreshToken,
      userSnapshot: snapshot,
    });
  }
}
