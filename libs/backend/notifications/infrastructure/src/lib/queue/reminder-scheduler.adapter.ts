import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import type {
  IReminderScheduler,
  IssueNotificationCommand,
} from '@det/backend-notifications-application';
import type { DateTime } from '@det/backend-shared-ddd';

import { NOTIFICATIONS_REMINDERS_QUEUE } from './notifications-queue.constants';

@Injectable()
export class ReminderSchedulerAdapter implements IReminderScheduler {
  constructor(
    @InjectQueue(NOTIFICATIONS_REMINDERS_QUEUE)
    private readonly queue: Queue,
  ) {}

  async scheduleReminder(
    jobKey: string,
    runAt: DateTime,
    command: IssueNotificationCommand,
  ): Promise<void> {
    const delay = Math.max(runAt.toDate().getTime() - Date.now(), 0);

    await this.queue.add(
      'issue-and-send',
      { commandJson: JSON.stringify(command) },
      { delay, jobId: jobKey },
    );
  }

  async cancelReminders(jobKey: string): Promise<void> {
    const job = await this.queue.getJob(jobKey);

    if (job) {
      await job.remove();
    }
  }
}
