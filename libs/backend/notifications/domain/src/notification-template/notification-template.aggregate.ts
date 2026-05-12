import { AggregateRoot, DateTime } from '@det/backend-shared-ddd';

import {
  EmptyDefaultChannelsError,
  EmptyTemplateTitleError,
  TemplateBodyMissingForChannelError,
} from './notification-template.errors';
import { NotificationTemplateUpdated } from './notification-template.events';

import type { NotificationChannel } from '../value-objects/notification-channel';
import type { TemplateCode } from '../value-objects/template-code';

export interface CreateNotificationTemplateProps {
  readonly code: TemplateCode;
  readonly title: string;
  readonly bodyByChannel: Partial<Record<NotificationChannel, string | null>>;
  readonly defaultChannels: readonly NotificationChannel[];
  readonly isCritical: boolean;
  readonly now: DateTime;
}

export interface UpdateNotificationTemplateProps {
  readonly title?: string;
  readonly bodyByChannel?: Partial<Record<NotificationChannel, string | null>>;
  readonly defaultChannels?: readonly NotificationChannel[];
  readonly now: DateTime;
}

export interface NotificationTemplateSnapshot {
  readonly code: TemplateCode;
  readonly title: string;
  readonly bodyByChannel: Partial<Record<NotificationChannel, string | null>>;
  readonly defaultChannels: readonly NotificationChannel[];
  readonly isCritical: boolean;
  readonly updatedAt: string;
}

export class NotificationTemplate extends AggregateRoot<TemplateCode> {
  private constructor(
    private readonly _code: TemplateCode,
    private _title: string,
    private _bodyByChannel: Partial<Record<NotificationChannel, string | null>>,
    private _defaultChannels: NotificationChannel[],
    private readonly _isCritical: boolean,
    private _updatedAt: DateTime,
  ) {
    super();
  }

  override get id(): TemplateCode {
    return this._code;
  }

  get code(): TemplateCode {
    return this._code;
  }

  get isCritical(): boolean {
    return this._isCritical;
  }

  get defaultChannels(): readonly NotificationChannel[] {
    return [...this._defaultChannels];
  }

  static create(props: CreateNotificationTemplateProps): NotificationTemplate {
    NotificationTemplate.validateTitle(props.title);
    NotificationTemplate.validateDefaultChannels(props.defaultChannels);
    NotificationTemplate.validateBodyCoversDefaults(props.bodyByChannel, props.defaultChannels);

    return new NotificationTemplate(
      props.code,
      props.title,
      { ...props.bodyByChannel },
      [...props.defaultChannels],
      props.isCritical,
      props.now,
    );
  }

  static restore(snapshot: NotificationTemplateSnapshot): NotificationTemplate {
    return new NotificationTemplate(
      snapshot.code,
      snapshot.title,
      { ...snapshot.bodyByChannel },
      [...snapshot.defaultChannels],
      snapshot.isCritical,
      DateTime.from(snapshot.updatedAt),
    );
  }

  update(props: UpdateNotificationTemplateProps): void {
    if (props.title !== undefined) {
      NotificationTemplate.validateTitle(props.title);
      this._title = props.title;
    }

    if (props.bodyByChannel !== undefined) {
      this._bodyByChannel = { ...props.bodyByChannel };
    }

    if (props.defaultChannels !== undefined) {
      NotificationTemplate.validateDefaultChannels(props.defaultChannels);
      this._defaultChannels = [...props.defaultChannels];
    }

    NotificationTemplate.validateBodyCoversDefaults(this._bodyByChannel, this._defaultChannels);

    this._updatedAt = props.now;
    this.addEvent(new NotificationTemplateUpdated(this._code, props.now));
  }

  toSnapshot(): NotificationTemplateSnapshot {
    return {
      bodyByChannel: { ...this._bodyByChannel },
      code: this._code,
      defaultChannels: [...this._defaultChannels],
      isCritical: this._isCritical,
      title: this._title,
      updatedAt: this._updatedAt.iso(),
    };
  }

  private static validateTitle(title: string): void {
    if (title.trim().length === 0) {
      throw new EmptyTemplateTitleError();
    }
  }

  private static validateDefaultChannels(channels: readonly NotificationChannel[]): void {
    if (channels.length === 0) {
      throw new EmptyDefaultChannelsError();
    }
  }

  private static validateBodyCoversDefaults(
    bodyByChannel: Partial<Record<NotificationChannel, string | null>>,
    defaultChannels: readonly NotificationChannel[],
  ): void {
    for (const ch of defaultChannels) {
      if (bodyByChannel[ch] === null || bodyByChannel[ch] === undefined) {
        throw new TemplateBodyMissingForChannelError(ch);
      }
    }
  }
}
