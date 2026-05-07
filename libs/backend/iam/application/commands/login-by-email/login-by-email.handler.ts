import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  Email,
  PasswordHash,
  RefreshSession,
  UserStatus,
  type IRefreshSessionRepository,
  type IUserRepository,
} from '@det/backend/iam/domain';
import { CLOCK, ID_GENERATOR } from '@det/backend/shared/ddd';
import type { IClock, IIdGenerator } from '@det/backend/shared/ddd';

import { LoginByEmailCommand } from './login-by-email.command';
import {
  PASSWORD_HASHER,
  REFRESH_SESSION_REPOSITORY,
  TOKEN_GENERATOR,
  USER_REPOSITORY,
} from '../../di/tokens';
import { InvalidCredentialsError } from '../../errors/application.errors';
import { JWT_ISSUER } from '../../ports/jwt-issuer/jwt-issuer.port';
import { buildLoginResponse } from '../shared/build-login-response';

import type { LoginResponseDto } from '../../dto/login-response/login-response.dto';
import type { IJwtIssuer } from '../../ports/jwt-issuer/jwt-issuer.port';
import type { IPasswordHasher } from '../../ports/password-hasher/password-hasher.port';
import type { ITokenGenerator } from '../../ports/token-generator/token-generator.port';

@CommandHandler(LoginByEmailCommand)
export class LoginByEmailHandler implements ICommandHandler<LoginByEmailCommand, LoginResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly sessionRepo: IRefreshSessionRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_GENERATOR) private readonly tokenGen: ITokenGenerator,
    @Inject(JWT_ISSUER) private readonly jwtIssuer: IJwtIssuer,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: LoginByEmailCommand): Promise<LoginResponseDto> {
    const email = Email.from(cmd.email);
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const snapshot = user.toSnapshot();

    if (snapshot.status !== UserStatus.ACTIVE) {
      throw new InvalidCredentialsError();
    }

    if (snapshot.passwordHash === null) {
      throw new InvalidCredentialsError();
    }

    const valid = await this.passwordHasher.verify(
      cmd.password,
      PasswordHash.fromHash(snapshot.passwordHash),
    );

    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const now = this.clock.now();
    const refreshTokenData = this.tokenGen.generateRefreshToken();

    const session = RefreshSession.issue({
      idGen: this.idGen,
      now,
      tokenHash: refreshTokenData.hash,
      userId: user.id,
    });

    await this.sessionRepo.save(session);

    return buildLoginResponse({
      jwtIssuer: this.jwtIssuer,
      refreshToken: refreshTokenData.raw,
      userSnapshot: snapshot,
    });
  }
}
