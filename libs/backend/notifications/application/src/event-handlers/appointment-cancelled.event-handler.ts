import { Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TemplatePayload } from '@det/backend-notifications-domain';
import type { AppointmentCancelledEvent } from '@det/shared-contracts';
import type { UserId } from '@det/shared-types';

import { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';
import { REMINDER_SCHEDULER } from '../di/tokens';

import type { IReminderScheduler } from '../ports/reminder-scheduler.port';

export class AppointmentCancelledHandler {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    @Inject(REMINDER_SCHEDULER) private readonly reminderScheduler: IReminderScheduler,
  ) {}

  async handle(event: AppointmentCancelledEvent): Promise<void> {
    await this.commandBus.execute(
      new IssueNotificationCommand(
        { kind: 'user', userId: event.clientId as UserId },
        'APPOINTMENT_CANCELLED',
        TemplatePayload.from({ reason: event.reason }),
      ),
    );

    await this.reminderScheduler.cancelReminders(`reminder:${event.appointmentId}:24h`);
    await this.reminderScheduler.cancelReminders(`reminder:${event.appointmentId}:2h`);
  }
}
