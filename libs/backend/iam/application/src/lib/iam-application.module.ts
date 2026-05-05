import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AcceptInvitationHandler } from './commands/accept-invitation/accept-invitation.handler';
import { BlockUserHandler } from './commands/block-user/block-user.handler';
import { ChangePasswordHandler } from './commands/change-password/change-password.handler';
import { IssueInvitationHandler } from './commands/issue-invitation/issue-invitation.handler';
import { RegisterOwnerHandler } from './commands/register-owner/register-owner.handler';
import { GetCurrentUserHandler } from './queries/get-current-user/get-current-user.handler';

import type { DynamicModule, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  AcceptInvitationHandler,
  BlockUserHandler,
  ChangePasswordHandler,
  IssueInvitationHandler,
  RegisterOwnerHandler,
];

const QUERY_HANDLERS = [GetCurrentUserHandler];

@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class IamApplicationModule {
  static register(providers: readonly Provider[]): DynamicModule {
    return {
      exports: [CqrsModule],
      imports: [CqrsModule],
      module: IamApplicationModule,
      providers: [...providers, ...COMMAND_HANDLERS, ...QUERY_HANDLERS],
    };
  }
}
