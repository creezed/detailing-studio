import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  DeletePushSubscriptionCommand,
  SavePushSubscriptionCommand,
} from '@det/backend-notifications-application';
import { CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import { DateTime } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

import { SavePushSubscriptionBodyDto } from '../dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('me/push-subscriptions')
export class PushSubscriptionsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Сохранить push-подписку' })
  @ApiCreatedResponse({ description: 'Подписка сохранена' })
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SavePushSubscriptionBodyDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new SavePushSubscriptionCommand(
        user.id as UserId,
        dto.endpoint,
        { p256dh: dto.keys.p256dh, auth: dto.keys.auth },
        dto.userAgent ?? null,
        DateTime.now(),
      ),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить push-подписку' })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.commandBus.execute(new DeletePushSubscriptionCommand(user.id as UserId, id));
  }
}
