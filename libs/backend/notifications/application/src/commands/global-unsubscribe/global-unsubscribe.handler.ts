import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { UserNotificationPreferences } from '@det/backend-notifications-domain';
import type {
  INotificationTemplateRepository,
  IUserNotificationPreferencesRepository,
} from '@det/backend-notifications-domain';
import type { UserId } from '@det/shared-types';

import { GlobalUnsubscribeCommand } from './global-unsubscribe.command';
import {
  NOTIFICATION_TEMPLATE_REPOSITORY,
  USER_NOTIFICATION_PREFERENCES_REPOSITORY,
} from '../../di/tokens';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(GlobalUnsubscribeCommand)
export class GlobalUnsubscribeHandler implements ICommandHandler<GlobalUnsubscribeCommand, void> {
  constructor(
    @Inject(USER_NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly prefsRepo: IUserNotificationPreferencesRepository,
    @Inject(NOTIFICATION_TEMPLATE_REPOSITORY)
    private readonly templateRepo: INotificationTemplateRepository,
  ) {}

  async execute(cmd: GlobalUnsubscribeCommand): Promise<void> {
    const userId = this.parseUnsubscribeToken(cmd.unsubscribeToken);

    let prefs = await this.prefsRepo.findByUserId(userId);

    if (!prefs) {
      const templates = await this.templateRepo.findAll();
      const defaults = new Map(templates.map((t) => [t.code, [...t.defaultChannels]]));

      prefs = UserNotificationPreferences.createDefault({
        defaults,
        now: cmd.now,
        userId,
      });
    }

    prefs.unsubscribeChannelGlobally(cmd.channel, cmd.now);
    await this.prefsRepo.save(prefs);
  }

  private parseUnsubscribeToken(token: string): UserId {
    // TODO: N.4 — validate HMAC signature and extract userId
    return token as UserId;
  }
}
