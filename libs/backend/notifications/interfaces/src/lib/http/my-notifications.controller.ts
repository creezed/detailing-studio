import { Body, Controller, Get, HttpCode, HttpStatus, Put, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import {
  GetMyPreferencesQuery,
  ListMyNotificationsQuery,
  UpdateMyPreferencesCommand,
} from '@det/backend-notifications-application';
import type {
  IanaTz,
  NotificationChannel,
  QuietHoursProps,
  TemplateCode,
} from '@det/backend-notifications-application';
import { CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import { DateTime } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

import { ListMyNotificationsQueryDto, UpdatePreferencesBodyDto } from '../dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('me/notifications')
export class MyNotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Мои уведомления' })
  @ApiOkResponse({ description: 'Список уведомлений текущего пользователя с пагинацией' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: ListMyNotificationsQueryDto,
  ): Promise<unknown> {
    return this.queryBus.execute(
      new ListMyNotificationsQuery(
        user.id as UserId,
        q.status,
        q.templateCode,
        q.channel,
        q.fromDate,
        q.toDate,
        q.cursor,
        q.limit,
      ),
    );
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Мои настройки уведомлений' })
  @ApiOkResponse({ description: 'Текущие настройки каналов и тихих часов' })
  async getPreferences(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.queryBus.execute(new GetMyPreferencesQuery(user.id as UserId));
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить настройки уведомлений' })
  @ApiOkResponse({ description: 'Настройки обновлены' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiUnprocessableEntityResponse({ description: 'Критический шаблон нельзя полностью отключить' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesBodyDto,
  ): Promise<void> {
    let channelsByTemplate: ReadonlyMap<TemplateCode, readonly NotificationChannel[]> | null = null;

    if (dto.channelsByTemplate) {
      channelsByTemplate = new Map(
        Object.entries(dto.channelsByTemplate).map(([k, v]) => [
          k as TemplateCode,
          v as NotificationChannel[],
        ]),
      );
    }

    const quietHours: QuietHoursProps | null | undefined = dto.quietHours
      ? {
          startMinuteOfDay: dto.quietHours.startMinuteOfDay,
          endMinuteOfDay: dto.quietHours.endMinuteOfDay,
          timezone: dto.quietHours.timezone as IanaTz,
        }
      : undefined;

    await this.commandBus.execute(
      new UpdateMyPreferencesCommand(
        user.id as UserId,
        channelsByTemplate,
        quietHours,
        DateTime.now(),
      ),
    );
  }
}
