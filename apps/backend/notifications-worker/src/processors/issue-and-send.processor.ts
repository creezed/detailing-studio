import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { IssueNotificationCommand } from '@det/backend-notifications-application';
import { NOTIFICATIONS_REMINDERS_QUEUE } from '@det/backend-notifications-infrastructure';

import { REMINDERS_CONCURRENCY } from '../config/worker.config';

import type { Job } from 'bullmq';

export interface IssueAndSendJobData {
  readonly commandJson: string;
}

@Processor(NOTIFICATIONS_REMINDERS_QUEUE, {
  concurrency: REMINDERS_CONCURRENCY,
})
export class IssueAndSendProcessor extends WorkerHost {
  private readonly logger = new Logger(IssueAndSendProcessor.name);

  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async process(job: Job<IssueAndSendJobData>): Promise<void> {
    const parsed: unknown = JSON.parse(job.data.commandJson);

    if (typeof parsed !== 'object' || parsed === null) {
      this.logger.error(`Invalid command payload in job ${String(job.id)}`);

      return;
    }

    const raw = parsed as Record<string, unknown>;

    const cmd = new IssueNotificationCommand(
      raw['recipient'] as IssueNotificationCommand['recipient'],
      raw['templateCode'] as IssueNotificationCommand['templateCode'],
      raw['payload'] as IssueNotificationCommand['payload'],
      null,
      (raw['requestedChannels'] as IssueNotificationCommand['requestedChannels']) ?? null,
    );

    await this.commandBus.execute(cmd);

    this.logger.log(
      `Reminder job ${String(job.id)} issued notification for template ${cmd.templateCode}`,
    );
  }
}
