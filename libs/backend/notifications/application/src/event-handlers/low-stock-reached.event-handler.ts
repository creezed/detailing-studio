import { Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TemplatePayload } from '@det/backend-notifications-domain';
import type { LowStockReachedEvent } from '@det/shared-contracts';
import type { BranchId } from '@det/shared-types';

import { IssueNotificationCommand } from '../commands/issue-notification/issue-notification.command';
import { ROLE_ROSTER_PORT } from '../di/tokens';

import type { IRoleRosterPort } from '../ports/role-roster.port';

export class LowStockReachedHandler {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    @Inject(ROLE_ROSTER_PORT) private readonly roleRoster: IRoleRosterPort,
  ) {}

  async handle(event: LowStockReachedEvent): Promise<void> {
    const payload = TemplatePayload.from({
      branchId: event.branchId,
      branchName: event.branchName,
      currentQty: event.currentQty,
      reorderLevel: event.reorderLevel,
      skuId: event.skuId,
      skuName: event.skuName,
    });

    const managers = await this.roleRoster.getUserIdsByRoleAndBranch(
      'MANAGER',
      event.branchId as BranchId,
    );
    const owners = await this.roleRoster.getUserIdsByRoleAndBranch(
      'OWNER',
      event.branchId as BranchId,
    );
    const recipients = [...managers, ...owners];

    for (const userId of recipients) {
      await this.commandBus.execute(
        new IssueNotificationCommand({ kind: 'user', userId }, 'LOW_STOCK', payload),
      );
    }
  }
}
