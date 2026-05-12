import { Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { NotificationChannel, TemplatePayload } from '@det/backend-notifications-domain';
import type { InvitationIssuedEvent } from '@det/shared-contracts';

import { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';

export class InvitationIssuedHandler {
  constructor(@Inject(CommandBus) private readonly commandBus: CommandBus) {}

  async handle(event: InvitationIssuedEvent): Promise<void> {
    await this.commandBus.execute(
      new IssueNotificationCommand(
        { kind: 'email', email: event.email },
        'INVITATION_ISSUED',
        TemplatePayload.from({
          expiresAt: event.expiresAt,
          invitationUrl: event.invitationUrl,
        }),
        null,
        [NotificationChannel.EMAIL],
      ),
    );
  }
}
