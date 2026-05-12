import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  ListFailedNotificationsQuery,
  ListNotificationsAdminQuery,
  RetryFailedNotificationCommand,
} from '@det/backend-notifications-application';
import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import { DateTime } from '@det/backend-shared-ddd';
import type { NotificationId, UserId } from '@det/shared-types';

import { ListNotificationsAdminQueryDto } from '../dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'Notification'))
  @ApiOperation({ summary: 'Список уведомлений (админ)' })
  @ApiOkResponse({ description: 'Список уведомлений с фильтрацией' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  async list(@Query() q: ListNotificationsAdminQueryDto): Promise<unknown> {
    return this.queryBus.execute(
      new ListNotificationsAdminQuery(
        q.status,
        q.templateCode,
        q.channel,
        q.userId,
        q.dateFrom,
        q.dateTo,
        q.cursor,
        q.limit,
      ),
    );
  }

  @Get('failed')
  @CheckAbility((ab) => ab.can('read', 'Notification'))
  @ApiOperation({ summary: 'Список неотправленных уведомлений' })
  @ApiOkResponse({ description: 'Уведомления со статусом FAILED' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  async listFailed(): Promise<unknown> {
    return this.queryBus.execute(new ListFailedNotificationsQuery());
  }

  @Post(':id/retry')
  @CheckAbility((ab) => ab.can('retry', 'Notification'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повторить отправку уведомления' })
  @ApiOkResponse({ description: 'Уведомление поставлено в очередь повторно' })
  @ApiNotFoundResponse({ description: 'Уведомление не найдено' })
  @ApiConflictResponse({ description: 'Уведомление не в статусе FAILED' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  async retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(
      new RetryFailedNotificationCommand(id as NotificationId, user.id as UserId, DateTime.now()),
    );
  }
}
