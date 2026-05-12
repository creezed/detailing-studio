import { Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TemplatePayload } from '@det/backend-notifications-domain';
import type { UserRegisteredEvent } from '@det/shared-contracts';
import type { UserId } from '@det/shared-types';

import { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';

export class UserRegisteredHandler {
  constructor(@Inject(CommandBus) private readonly commandBus: CommandBus) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    await this.commandBus.execute(
      new IssueNotificationCommand(
        { kind: 'user', userId: event.userId as UserId },
        'USER_REGISTERED',
        TemplatePayload.from({ fullName: event.fullName }),
      ),
    );
  }
}
