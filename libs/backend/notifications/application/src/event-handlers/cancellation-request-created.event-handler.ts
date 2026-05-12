import { Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TemplatePayload } from '@det/backend-notifications-domain';
import type { CancellationRequestCreatedEvent } from '@det/shared-contracts';
import type { BranchId } from '@det/shared-types';

import { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';
import { ROLE_ROSTER_PORT } from '../di/tokens';

import type { IRoleRosterPort } from '../ports/role-roster.port';

export class CancellationRequestCreatedHandler {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    @Inject(ROLE_ROSTER_PORT) private readonly roleRoster: IRoleRosterPort,
  ) {}

  async handle(event: CancellationRequestCreatedEvent): Promise<void> {
    const managers = await this.roleRoster.getUserIdsByRoleAndBranch(
      'MANAGER',
      event.branchId as BranchId,
    );

    const payload = TemplatePayload.from({
      appointmentId: event.appointmentId,
      clientId: event.clientId,
      reason: event.reason,
    });

    for (const userId of managers) {
      await this.commandBus.execute(
        new IssueNotificationCommand({ kind: 'user', userId }, 'CANCELLATION_REQUEST_NEW', payload),
      );
    }
  }
}
