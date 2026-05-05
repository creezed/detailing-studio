import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOkResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';

import {
  BlockUserCommand,
  ChangePasswordCommand,
  GetCurrentUserQuery,
  UserId,
  appSubject,
  type CurrentUserDto,
} from '@det/backend/iam/application';

import { AbilityGuard, CheckAbility } from './ability.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  BlockUserRequestDto,
  ChangePasswordRequestDto,
  CurrentUserResponseDto,
} from '../dto/users.dto';

import type { AuthenticatedUser } from '../guards/auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AbilityGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  @CheckAbility((ability, context) =>
    ability.can('read', appSubject('User', { id: context.user.id })),
  )
  @ApiOkResponse({ type: CurrentUserResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<CurrentUserResponseDto> {
    const result = await this.queryBus.execute<GetCurrentUserQuery, CurrentUserDto>(
      new GetCurrentUserQuery(UserId.from(user.id)),
    );

    return result as unknown as CurrentUserResponseDto;
  }

  @Post('me/password')
  @CheckAbility((ability, context) =>
    ability.can('update', appSubject('User', { id: context.user.id })),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new ChangePasswordCommand(UserId.from(user.id), dto.oldPassword, dto.newPassword),
    );
  }

  @Post(':id/block')
  @CheckAbility((ability, context) =>
    ability.can('manage', appSubject('User', { id: context.params['id'] })),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async blockUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlockUserRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new BlockUserCommand(UserId.from(id), UserId.from(actor.id), dto.reason),
    );
  }
}
