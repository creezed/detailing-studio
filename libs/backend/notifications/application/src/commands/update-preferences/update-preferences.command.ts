import type {
  NotificationChannel,
  TemplateCode,
  QuietHoursProps,
} from '@det/backend-notifications-domain';
import type { DateTime } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

export class UpdateMyPreferencesCommand {
  constructor(
    public readonly userId: UserId,
    public readonly channelsByTemplate: ReadonlyMap<
      TemplateCode,
      readonly NotificationChannel[]
    > | null,
    public readonly quietHours: QuietHoursProps | null | undefined,
    public readonly now: DateTime,
  ) {}
}
