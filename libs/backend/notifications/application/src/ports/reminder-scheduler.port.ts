import type { DateTime } from '@det/backend-shared-ddd';

import type { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';

export interface IReminderScheduler {
  scheduleReminder(
    jobKey: string,
    runAt: DateTime,
    command: IssueNotificationCommand,
  ): Promise<void>;
  cancelReminders(jobKey: string): Promise<void>;
}

export const REMINDER_SCHEDULER = Symbol('REMINDER_SCHEDULER');
