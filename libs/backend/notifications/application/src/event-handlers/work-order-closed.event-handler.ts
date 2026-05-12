import { Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TemplatePayload } from '@det/backend-notifications-domain';
import type { WorkOrderClosedEvent } from '@det/shared-contracts';
import type { UserId } from '@det/shared-types';

import { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';

export class WorkOrderClosedHandler {
  constructor(@Inject(CommandBus) private readonly commandBus: CommandBus) {}

  async handle(event: WorkOrderClosedEvent): Promise<void> {
    await this.commandBus.execute(
      new IssueNotificationCommand(
        { kind: 'user', userId: event.clientId as UserId },
        'WORK_ORDER_COMPLETED',
        TemplatePayload.from({
          clientCabinetUrl: event.clientCabinetUrl,
          serviceList: event.serviceList,
          workOrderId: event.workOrderId,
        }),
      ),
    );
  }
}
