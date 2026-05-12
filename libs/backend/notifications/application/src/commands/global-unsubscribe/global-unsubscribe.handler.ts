import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { UserNotificationPreferences } from '@det/backend-notifications-domain';
import type {
  INotificationTemplateRepository,
  IUserNotificationPreferencesRepository,
} from '@det/backend-notifications-domain';

import { GlobalUnsubscribeCommand } from './global-unsubscribe.command';
import {
  NOTIFICATION_TEMPLATE_REPOSITORY,
  UNSUBSCRIBE_SECRET,
  USER_NOTIFICATION_PREFERENCES_REPOSITORY,
} from '../../di/tokens';
import { InvalidUnsubscribeTokenError } from '../../errors/application.errors';
import { verifyUnsubscribeToken } from '../../unsubscribe/unsubscribe-token.service';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(GlobalUnsubscribeCommand)
export class GlobalUnsubscribeHandler implements ICommandHandler<GlobalUnsubscribeCommand, void> {
  constructor(
    @Inject(USER_NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly prefsRepo: IUserNotificationPreferencesRepository,
    @Inject(NOTIFICATION_TEMPLATE_REPOSITORY)
    private readonly templateRepo: INotificationTemplateRepository,
    @Inject(UNSUBSCRIBE_SECRET)
    private readonly secret: string,
  ) {}

  async execute(cmd: GlobalUnsubscribeCommand): Promise<void> {
    const parsed = verifyUnsubscribeToken(cmd.unsubscribeToken, this.secret);

    if (!parsed) {
      throw new InvalidUnsubscribeTokenError();
    }

    let prefs = await this.prefsRepo.findByUserId(parsed.userId);

    if (!prefs) {
      const templates = await this.templateRepo.findAll();
      const defaults = new Map(templates.map((t) => [t.code, [...t.defaultChannels]]));

      prefs = UserNotificationPreferences.createDefault({
        defaults,
        now: cmd.now,
        userId: parsed.userId,
      });
    }

    prefs.unsubscribeChannelGlobally(parsed.channel, cmd.now);
    await this.prefsRepo.save(prefs);
  }
}
