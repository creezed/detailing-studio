import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOkResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';

import {
  BlockUserCommand,
  ChangePasswordCommand,
  GetCurrentUserQuery,
  UserId,
  type CurrentUserDto,
} from '@det/backend/iam/application';

import { CurrentUser } from '../decorators/current-user.decorator';
import {
  BlockUserRequestDto,
  ChangePasswordRequestDto,
  CurrentUserResponseDto,
} from '../dto/users.dto';

import type { AuthenticatedUser } from '../guards/auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  @ApiOkResponse({ type: CurrentUserResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<CurrentUserResponseDto> {
    const result = await this.queryBus.execute<GetCurrentUserQuery, CurrentUserDto>(
      new GetCurrentUserQuery(UserId.from(user.id)),
    );

    return result as unknown as CurrentUserResponseDto;
  }

  @Post('me/password')
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
