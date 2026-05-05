import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import {
  AcceptInvitationCommand,
  IssueInvitationCommand,
  Role,
  UserId,
} from '@det/backend/iam/application';
import { type BranchId } from '@det/shared/types';

import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { AcceptInvitationRequestDto, IssueInvitationRequestDto } from '../dto/invitations.dto';

import type { AuthenticatedUser } from '../guards/auth.guard';

@ApiTags('invitations')
@Controller('users/invitations')
export class InvitationsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Invitation issued' })
  async issue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: IssueInvitationRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new IssueInvitationCommand(
        UserId.from(user.id),
        dto.email,
        dto.role as Role,
        dto.branchIds as BranchId[],
      ),
    );
  }

  @Post(':token/accept')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async accept(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new AcceptInvitationCommand(token, dto.password, dto.fullName, dto.phone),
    );
  }
}
