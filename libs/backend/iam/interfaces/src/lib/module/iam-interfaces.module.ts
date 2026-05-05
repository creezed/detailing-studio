import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthGuard } from '../guards/auth.guard';
import { AbilityGuard } from '../http/ability.guard';
import { AuthController } from '../http/auth.controller';
import { IamApplicationExceptionFilter } from '../http/iam-application-exception.filter';
import { InvitationsController } from '../http/invitations.controller';
import { UsersController } from '../http/users.controller';

@Module({
  imports: [ThrottlerModule.forRoot([{ limit: 60, ttl: 60_000 }])],
  controllers: [AuthController, UsersController, InvitationsController],
  providers: [
    AbilityGuard,
    AuthGuard,
    { provide: APP_FILTER, useClass: IamApplicationExceptionFilter },
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class IamInterfacesModule {}
