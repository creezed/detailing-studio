import { AggregateRoot, DateTime } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

import { CriticalTemplateCannotBeFullyDisabledError } from './user-notification-preferences.errors';
import { UserNotificationPreferencesUpdated } from './user-notification-preferences.events';
import { QuietHours } from '../value-objects/quiet-hours.value-object';

import type { NotificationChannel } from '../value-objects/notification-channel';
import type { QuietHoursProps } from '../value-objects/quiet-hours.value-object';
import type { TemplateCode } from '../value-objects/template-code';

export interface CreateDefaultPrefsProps {
  readonly userId: UserId;
  readonly defaults: ReadonlyMap<TemplateCode, readonly NotificationChannel[]>;
  readonly now: DateTime;
}

export interface UserNotificationPreferencesSnapshot {
  readonly userId: string;
  readonly channelsByTemplate: Record<string, readonly string[]>;
  readonly quietHours: QuietHoursProps | null;
  readonly unsubscribedChannels: readonly string[];
  readonly updatedAt: string;
}

export class UserNotificationPreferences extends AggregateRoot<UserId> {
  private constructor(
    private readonly _userId: UserId,
    private readonly _channelsByTemplate: Map<TemplateCode, NotificationChannel[]>,
    private _quietHours: QuietHours | null,
    private readonly _unsubscribedChannels: Set<NotificationChannel>,
    private _updatedAt: DateTime,
  ) {
    super();
  }

  override get id(): UserId {
    return this._userId;
  }

  get userId(): UserId {
    return this._userId;
  }

  get quietHours(): QuietHours | null {
    return this._quietHours;
  }

  static createDefault(props: CreateDefaultPrefsProps): UserNotificationPreferences {
    const channelsByTemplate = new Map<TemplateCode, NotificationChannel[]>();

    for (const [code, channels] of props.defaults) {
      channelsByTemplate.set(code, [...channels]);
    }

    return new UserNotificationPreferences(
      props.userId,
      channelsByTemplate,
      null,
      new Set(),
      props.now,
    );
  }

  static restore(snapshot: UserNotificationPreferencesSnapshot): UserNotificationPreferences {
    const channelsByTemplate = new Map<TemplateCode, NotificationChannel[]>();

    for (const [code, channels] of Object.entries(snapshot.channelsByTemplate)) {
      channelsByTemplate.set(
        code as TemplateCode,
        channels.map((ch) => ch as NotificationChannel),
      );
    }

    return new UserNotificationPreferences(
      snapshot.userId as UserId,
      channelsByTemplate,
      snapshot.quietHours === null ? null : QuietHours.restore(snapshot.quietHours),
      new Set(snapshot.unsubscribedChannels.map((ch) => ch as NotificationChannel)),
      DateTime.from(snapshot.updatedAt),
    );
  }

  setChannelsForTemplate(
    code: TemplateCode,
    channels: readonly NotificationChannel[],
    isCritical: boolean,
    now: DateTime,
  ): void {
    if (isCritical && channels.length === 0) {
      throw new CriticalTemplateCannotBeFullyDisabledError(code);
    }

    this._channelsByTemplate.set(code, [...channels]);
    this.touch(now);
  }

  setQuietHours(qh: QuietHours | null, now: DateTime): void {
    this._quietHours = qh;
    this.touch(now);
  }

  unsubscribeChannelGlobally(ch: NotificationChannel, now: DateTime): void {
    this._unsubscribedChannels.add(ch);
    this.touch(now);
  }

  resubscribeChannel(ch: NotificationChannel, now: DateTime): void {
    if (this._unsubscribedChannels.delete(ch)) {
      this.touch(now);
    }
  }

  resolveChannelsFor(code: TemplateCode, isCritical: boolean): NotificationChannel[] {
    const channels = this._channelsByTemplate.get(code) ?? [];

    if (isCritical) {
      return [...channels];
    }

    return channels.filter((ch) => !this._unsubscribedChannels.has(ch));
  }

  toSnapshot(): UserNotificationPreferencesSnapshot {
    const channelsByTemplate: Record<string, readonly string[]> = {};

    for (const [code, channels] of this._channelsByTemplate) {
      channelsByTemplate[code] = [...channels];
    }

    return {
      channelsByTemplate,
      quietHours: this._quietHours?.toSnapshot() ?? null,
      unsubscribedChannels: [...this._unsubscribedChannels],
      updatedAt: this._updatedAt.iso(),
      userId: this._userId,
    };
  }

  private touch(now: DateTime): void {
    this._updatedAt = now;
    this.addEvent(new UserNotificationPreferencesUpdated(this._userId, now));
  }
}
