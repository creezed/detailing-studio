import { DomainError } from '@det/backend-shared-ddd';

import type { NotificationChannel } from '../value-objects/notification-channel';

export class TemplateBodyMissingForChannelError extends DomainError {
  readonly code = 'TEMPLATE_BODY_MISSING_FOR_CHANNEL';
  readonly httpStatus = 422;

  constructor(public readonly channel: NotificationChannel) {
    super(`Template body is missing for default channel: ${channel}`);
  }
}

export class EmptyDefaultChannelsError extends DomainError {
  readonly code = 'EMPTY_DEFAULT_CHANNELS';
  readonly httpStatus = 422;

  constructor() {
    super('Default channels must not be empty');
  }
}

export class EmptyTemplateTitleError extends DomainError {
  readonly code = 'EMPTY_TEMPLATE_TITLE';
  readonly httpStatus = 422;

  constructor() {
    super('Template title must not be empty');
  }
}
