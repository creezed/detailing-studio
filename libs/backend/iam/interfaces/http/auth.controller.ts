import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import {
  LoginByEmailCommand,
  LoginByPhoneOtpCommand,
  LogoutCommand,
  RefreshTokensCommand,
  RegisterOwnerCommand,
  RequestOtpCommand,
  UserId,
  type LoginResponseDto as AppLoginResponseDto,
} from '@det/backend/iam/application';

import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import {
  LoginRequestDto,
  LoginResponseDto,
  LogoutRequestDto,
  OtpRequestDto,
  OtpVerifyRequestDto,
  RefreshRequestDto,
  RegisterOwnerRequestDto,
} from '../dto/auth.dto';

import type { AuthenticatedUser } from '../guards/auth.guard';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
const REGISTER_OWNER_DEVICE_FINGERPRINT = 'owner-self-signup';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register-owner')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: LoginResponseDto })
  async registerOwner(@Body() dto: RegisterOwnerRequestDto): Promise<LoginResponseDto> {
    await this.commandBus.execute<RegisterOwnerCommand, { id: UserId }>(
      new RegisterOwnerCommand(dto.email, dto.phone, dto.password, dto.fullName),
    );

    return this.commandBus.execute<LoginByEmailCommand, AppLoginResponseDto>(
      new LoginByEmailCommand(dto.email, dto.password, REGISTER_OWNER_DEVICE_FINGERPRINT),
    );
  }

  @Post('login')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.commandBus.execute<LoginByEmailCommand, AppLoginResponseDto>(
      new LoginByEmailCommand(dto.email, dto.password, dto.deviceFingerprint),
    );
  }

  @Post('otp/request')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async requestOtp(@Body() dto: OtpRequestDto): Promise<void> {
    await this.commandBus.execute(new RequestOtpCommand(dto.phone));
  }

  @Post('otp/verify')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  async verifyOtp(@Body() dto: OtpVerifyRequestDto): Promise<LoginResponseDto> {
    return this.commandBus.execute<LoginByPhoneOtpCommand, AppLoginResponseDto>(
      new LoginByPhoneOtpCommand(dto.phone, dto.code, dto.deviceFingerprint),
    );
  }

  @Post('refresh')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  async refresh(@Body() dto: RefreshRequestDto): Promise<LoginResponseDto> {
    return this.commandBus.execute<RefreshTokensCommand, AppLoginResponseDto>(
      new RefreshTokensCommand(dto.refreshToken, dto.deviceFingerprint),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(new LogoutCommand(UserId.from(user.id), dto.refreshToken));
  }
}
