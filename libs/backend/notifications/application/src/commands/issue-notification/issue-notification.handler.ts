import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import {
  DeduplicationService,
  Notification,
  NotificationChannel,
  UserNotificationPreferences,
} from '@det/backend-notifications-domain';
import type {
  DedupKey,
  INotificationRepository,
  INotificationTemplateRepository,
  IUserNotificationPreferencesRepository,
  NotificationTemplate,
  RecipientRef,
  UserNotificationPreferences as UserNotificationPreferencesType,
} from '@det/backend-notifications-domain';
import { CLOCK, DateTime, ID_GENERATOR } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import type { NotificationId, UserId } from '@det/shared-types';

import { IssueNotificationCommand } from './issue-notification.command';
import {
  NOTIFICATION_REPOSITORY,
  NOTIFICATION_TEMPLATE_REPOSITORY,
  USER_CONTACT_PORT,
  USER_NOTIFICATION_PREFERENCES_REPOSITORY,
} from '../../di/tokens';
import { TemplateNotFoundError } from '../../errors/application.errors';

import type { IUserContactPort } from '../../ports/user-contact.port';
import type { ICommandHandler } from '@nestjs/cqrs';

export interface NotificationIssuedSummary {
  readonly notificationIds: NotificationId[];
  readonly deduped: boolean[];
}

@CommandHandler(IssueNotificationCommand)
export class IssueNotificationHandler implements ICommandHandler<
  IssueNotificationCommand,
  NotificationIssuedSummary
> {
  private readonly dedup = new DeduplicationService();

  constructor(
    @Inject(NOTIFICATION_TEMPLATE_REPOSITORY)
    private readonly templateRepo: INotificationTemplateRepository,
    @Inject(USER_NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly prefsRepo: IUserNotificationPreferencesRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifRepo: INotificationRepository,
    @Inject(USER_CONTACT_PORT) private readonly userContactPort: IUserContactPort,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: IssueNotificationCommand): Promise<NotificationIssuedSummary> {
    const now = this.clock.now();
    const template = await this.templateRepo.findByCode(cmd.templateCode);

    if (!template) {
      throw new TemplateNotFoundError(cmd.templateCode);
    }

    const channels = await this.resolveChannels(cmd, template, now);
    const notificationIds: NotificationId[] = [];
    const deduped: boolean[] = [];

    for (const channel of channels) {
      const recipients = await this.resolveRecipients(cmd.recipient, channel);

      for (const recipient of recipients) {
        const dedupKey = this.dedup.computeDedupKey(cmd.templateCode, cmd.payload, now);
        const isDeduped = await this.checkDedup(dedupKey, now);
        const id = this.idGen.generate() as NotificationId;

        const notification = Notification.issue({
          channel,
          dedupKey,
          id,
          now,
          payload: cmd.payload,
          recipient,
          scheduledFor: cmd.scheduledFor,
          templateCode: cmd.templateCode,
        });

        if (isDeduped) {
          notification.markDeduped(now);
        }

        await this.notifRepo.save(notification);
        notificationIds.push(id);
        deduped.push(isDeduped);
      }
    }

    return { notificationIds, deduped };
  }

  private async resolveChannels(
    cmd: IssueNotificationCommand,
    template: NotificationTemplate,
    now: ReturnType<IClock['now']>,
  ): Promise<NotificationChannel[]> {
    if (cmd.recipient.kind === 'phone') {
      return [NotificationChannel.SMS];
    }

    if (cmd.recipient.kind === 'email') {
      return [NotificationChannel.EMAIL];
    }

    if (cmd.recipient.kind === 'user') {
      let prefs = await this.prefsRepo.findByUserId(cmd.recipient.userId);

      if (!prefs) {
        prefs = this.createDefaultPrefs(cmd.recipient.userId, template, now);
        await this.prefsRepo.save(prefs);
      }

      const resolved = prefs.resolveChannelsFor(cmd.templateCode, template.isCritical);
      const requested = cmd.requestedChannels ?? template.defaultChannels;

      return resolved.filter((ch) => requested.includes(ch));
    }

    // cmd.recipient.kind === 'telegramChat' — the only remaining union member
    return [NotificationChannel.TELEGRAM];
  }

  private createDefaultPrefs(
    userId: UserId,
    template: NotificationTemplate,
    now: ReturnType<IClock['now']>,
  ): UserNotificationPreferencesType {
    return UserNotificationPreferences.createDefault({
      defaults: new Map([[template.code, [...template.defaultChannels]]]),
      now,
      userId,
    });
  }

  private async resolveRecipients(
    recipient: RecipientRef,
    channel: NotificationChannel,
  ): Promise<RecipientRef[]> {
    if (recipient.kind === 'user') {
      return this.userContactPort.getContactRefsFor(recipient.userId, channel);
    }

    return [recipient];
  }

  private async checkDedup(
    dedupKey: DedupKey | null,
    now: ReturnType<IClock['now']>,
  ): Promise<boolean> {
    if (!dedupKey) {
      return false;
    }

    const windowMs = dedupKey.windowEndsAt.toDate().getTime() - now.toDate().getTime();
    const sinceMs = now.toDate().getTime() - windowMs;
    const since = DateTime.from(sinceMs);
    const recent = await this.notifRepo.findByDedupKey(dedupKey.scopeKey, since);

    return this.dedup.shouldSuppress(dedupKey, recent);
  }
}
