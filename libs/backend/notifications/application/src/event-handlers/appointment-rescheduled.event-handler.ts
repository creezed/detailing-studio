import { Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TemplatePayload } from '@det/backend-notifications-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { AppointmentRescheduledEvent } from '@det/shared-contracts';
import type { UserId } from '@det/shared-types';

import { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';
import { REMINDER_SCHEDULER } from '../di/tokens';

import type { IReminderScheduler } from '../ports/reminder-scheduler.port';

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_2 = 2 * 60 * 60 * 1000;

export class AppointmentRescheduledHandler {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    @Inject(REMINDER_SCHEDULER) private readonly reminderScheduler: IReminderScheduler,
  ) {}

  async handle(event: AppointmentRescheduledEvent): Promise<void> {
    const recipient = { kind: 'user' as const, userId: event.clientId as UserId };

    await this.commandBus.execute(
      new IssueNotificationCommand(
        recipient,
        'APPOINTMENT_RESCHEDULED',
        TemplatePayload.from({
          branchAddress: event.branchAddress,
          datetime: event.newDatetime,
          serviceList: event.serviceList,
        }),
      ),
    );

    await this.reminderScheduler.cancelReminders(`reminder:${event.appointmentId}:24h`);
    await this.reminderScheduler.cancelReminders(`reminder:${event.appointmentId}:2h`);

    const startMs = DateTime.from(event.newDatetime).toDate().getTime();

    await this.reminderScheduler.scheduleReminder(
      `reminder:${event.appointmentId}:24h`,
      DateTime.from(startMs - HOURS_24),
      new IssueNotificationCommand(
        recipient,
        'APPOINTMENT_REMINDER',
        TemplatePayload.from({
          appointmentId: event.appointmentId,
          datetime: event.newDatetime,
          offset: '24h',
          serviceList: event.serviceList,
        }),
      ),
    );

    await this.reminderScheduler.scheduleReminder(
      `reminder:${event.appointmentId}:2h`,
      DateTime.from(startMs - HOURS_2),
      new IssueNotificationCommand(
        recipient,
        'APPOINTMENT_REMINDER',
        TemplatePayload.from({
          appointmentId: event.appointmentId,
          datetime: event.newDatetime,
          offset: '2h',
          serviceList: event.serviceList,
        }),
      ),
    );
  }
}
