import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { QuietHours, UserNotificationPreferences } from '@det/backend-notifications-domain';
import type {
  INotificationTemplateRepository,
  IUserNotificationPreferencesRepository,
} from '@det/backend-notifications-domain';

import { UpdateMyPreferencesCommand } from './update-preferences.command';
import {
  NOTIFICATION_TEMPLATE_REPOSITORY,
  USER_NOTIFICATION_PREFERENCES_REPOSITORY,
} from '../../di/tokens';
import { TemplateNotFoundError } from '../../errors/application.errors';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(UpdateMyPreferencesCommand)
export class UpdateMyPreferencesHandler implements ICommandHandler<
  UpdateMyPreferencesCommand,
  void
> {
  constructor(
    @Inject(USER_NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly prefsRepo: IUserNotificationPreferencesRepository,
    @Inject(NOTIFICATION_TEMPLATE_REPOSITORY)
    private readonly templateRepo: INotificationTemplateRepository,
  ) {}

  async execute(cmd: UpdateMyPreferencesCommand): Promise<void> {
    let prefs = await this.prefsRepo.findByUserId(cmd.userId);

    if (!prefs) {
      const templates = await this.templateRepo.findAll();
      const defaults = new Map(templates.map((t) => [t.code, [...t.defaultChannels]]));

      prefs = UserNotificationPreferences.createDefault({
        defaults,
        now: cmd.now,
        userId: cmd.userId,
      });
    }

    if (cmd.channelsByTemplate) {
      for (const [code, channels] of cmd.channelsByTemplate) {
        const template = await this.templateRepo.findByCode(code);

        if (!template) {
          throw new TemplateNotFoundError(code);
        }

        prefs.setChannelsForTemplate(code, channels, template.isCritical, cmd.now);
      }
    }

    if (cmd.quietHours !== undefined) {
      const qh = cmd.quietHours ? QuietHours.create(cmd.quietHours) : null;

      prefs.setQuietHours(qh, cmd.now);
    }

    await this.prefsRepo.save(prefs);
  }
}
