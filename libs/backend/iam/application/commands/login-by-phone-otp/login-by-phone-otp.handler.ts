import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  OtpPurpose,
  RefreshSession,
  UserStatus,
  type IOtpRequestRepository,
  type IRefreshSessionRepository,
  type IUserRepository,
} from '@det/backend/iam/domain';
import { CLOCK, ID_GENERATOR, PhoneNumber } from '@det/backend/shared/ddd';
import type { IClock, IIdGenerator } from '@det/backend/shared/ddd';

import { LoginByPhoneOtpCommand } from './login-by-phone-otp.command';
import {
  OTP_REQUEST_REPOSITORY,
  REFRESH_SESSION_REPOSITORY,
  TOKEN_GENERATOR,
  USER_REPOSITORY,
} from '../../di/tokens';
import { InvalidCredentialsError, OtpNotFoundError } from '../../errors/application.errors';
import { JWT_ISSUER } from '../../ports/jwt-issuer/jwt-issuer.port';

import type { LoginResponseDto } from '../../dto/login-response/login-response.dto';
import type { IJwtIssuer } from '../../ports/jwt-issuer/jwt-issuer.port';
import type { ITokenGenerator } from '../../ports/token-generator/token-generator.port';

@CommandHandler(LoginByPhoneOtpCommand)
export class LoginByPhoneOtpHandler
  implements ICommandHandler<LoginByPhoneOtpCommand, LoginResponseDto>
{
  constructor(
    @Inject(OTP_REQUEST_REPOSITORY) private readonly otpRepo: IOtpRequestRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly sessionRepo: IRefreshSessionRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokenGen: ITokenGenerator,
    @Inject(JWT_ISSUER) private readonly jwtIssuer: IJwtIssuer,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: LoginByPhoneOtpCommand): Promise<LoginResponseDto> {
    const phone = PhoneNumber.from(cmd.phone);
    const now = this.clock.now();

    const otpRequest = await this.otpRepo.findPendingByPhoneAndPurpose(phone, OtpPurpose.LOGIN);

    if (!otpRequest) {
      throw new OtpNotFoundError();
    }

    otpRequest.verify(cmd.code, now);
    await this.otpRepo.save(otpRequest);

    const user = await this.userRepo.findByPhone(phone);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const snapshot = user.toSnapshot();

    if (snapshot.status !== UserStatus.ACTIVE) {
      throw new InvalidCredentialsError();
    }

    const refreshTokenData = this.tokenGen.generateRefreshToken();

    const session = RefreshSession.issue({
      deviceFingerprint: cmd.deviceFingerprint,
      idGen: this.idGen,
      now,
      tokenHash: refreshTokenData.hash,
      userId: user.id,
    });

    await this.sessionRepo.save(session);

    const { token: accessToken, expiresIn } = await this.jwtIssuer.issueAccessToken({
      branches: [...snapshot.branchIds],
      role: snapshot.role,
      sub: snapshot.id,
    });

    return {
      accessToken,
      expiresIn,
      refreshToken: refreshTokenData.raw,
      user: {
        fullName: snapshot.fullName,
        id: snapshot.id,
        role: snapshot.role,
      },
    };
  }
}
