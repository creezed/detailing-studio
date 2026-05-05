import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthGuard } from '../guards/auth.guard';
import { AuthController } from '../http/auth.controller';
import { InvitationsController } from '../http/invitations.controller';
import { UsersController } from '../http/users.controller';

@Module({
  imports: [ThrottlerModule.forRoot([{ limit: 60, ttl: 60_000 }])],
  controllers: [AuthController, UsersController, InvitationsController],
  providers: [
    AuthGuard,
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class IamInterfacesModule {}
