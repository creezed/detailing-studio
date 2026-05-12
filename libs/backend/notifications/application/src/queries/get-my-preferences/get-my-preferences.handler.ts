import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import type { INotificationTemplateRepository } from '@det/backend-notifications-domain';

import { GetMyPreferencesQuery } from './get-my-preferences.query';
import { NOTIFICATION_TEMPLATE_REPOSITORY, PREFERENCES_READ_PORT } from '../../di/tokens';

import type { IPreferencesReadPort } from '../../ports/preferences-read.port';
import type { UserNotificationPreferencesDto } from '../../read-models/notification.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetMyPreferencesQuery)
export class GetMyPreferencesHandler implements IQueryHandler<
  GetMyPreferencesQuery,
  UserNotificationPreferencesDto
> {
  constructor(
    @Inject(PREFERENCES_READ_PORT)
    private readonly readPort: IPreferencesReadPort,
    @Inject(NOTIFICATION_TEMPLATE_REPOSITORY)
    private readonly templateRepo: INotificationTemplateRepository,
  ) {}

  async execute(query: GetMyPreferencesQuery): Promise<UserNotificationPreferencesDto> {
    const existing = await this.readPort.getByUserId(query.userId);

    if (existing) {
      return this.fillMissingTemplates(existing);
    }

    const templates = await this.templateRepo.findAll();
    const channelsByTemplate: Record<string, readonly string[]> = {};

    for (const tpl of templates) {
      channelsByTemplate[tpl.code] = [...tpl.defaultChannels];
    }

    return {
      channelsByTemplate,
      quietHours: null,
      unsubscribedChannels: [],
    };
  }

  private async fillMissingTemplates(
    dto: UserNotificationPreferencesDto,
  ): Promise<UserNotificationPreferencesDto> {
    const templates = await this.templateRepo.findAll();
    const filled: Record<string, readonly string[]> = { ...dto.channelsByTemplate };

    for (const tpl of templates) {
      if (!(tpl.code in filled)) {
        filled[tpl.code] = [...tpl.defaultChannels];
      }
    }

    return {
      channelsByTemplate: filled,
      quietHours: dto.quietHours,
      unsubscribedChannels: dto.unsubscribedChannels,
    };
  }
}
