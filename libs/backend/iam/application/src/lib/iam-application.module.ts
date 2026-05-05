import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AbilityFactory } from './abilities/ability.factory';
import { AcceptInvitationHandler } from './commands/accept-invitation/accept-invitation.handler';
import { BlockUserHandler } from './commands/block-user/block-user.handler';
import { ChangePasswordHandler } from './commands/change-password/change-password.handler';
import { IssueInvitationHandler } from './commands/issue-invitation/issue-invitation.handler';
import { LoginByEmailHandler } from './commands/login-by-email/login-by-email.handler';
import { LoginByPhoneOtpHandler } from './commands/login-by-phone-otp/login-by-phone-otp.handler';
import { LogoutHandler } from './commands/logout/logout.handler';
import { RefreshTokensHandler } from './commands/refresh-tokens/refresh-tokens.handler';
import { RegisterOwnerHandler } from './commands/register-owner/register-owner.handler';
import { RequestOtpHandler } from './commands/request-otp/request-otp.handler';
import { GetCurrentUserHandler } from './queries/get-current-user/get-current-user.handler';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  AcceptInvitationHandler,
  BlockUserHandler,
  ChangePasswordHandler,
  IssueInvitationHandler,
  LoginByEmailHandler,
  LoginByPhoneOtpHandler,
  LogoutHandler,
  RefreshTokensHandler,
  RegisterOwnerHandler,
  RequestOtpHandler,
];

const QUERY_HANDLERS = [GetCurrentUserHandler];

@Module({
  imports: [CqrsModule],
  providers: [AbilityFactory],
  exports: [AbilityFactory, CqrsModule],
})
export class IamApplicationModule {
  static register(
    providers: readonly Provider[],
    imports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    return {
      exports: [AbilityFactory, CqrsModule, ...providers],
      global: true,
      imports: [CqrsModule, ...imports],
      module: IamApplicationModule,
      providers: [AbilityFactory, ...providers, ...COMMAND_HANDLERS, ...QUERY_HANDLERS],
    };
  }
}
