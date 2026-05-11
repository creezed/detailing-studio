import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import type { IClock } from '@det/backend-shared-ddd';
import { WorkOrderId } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { CancelWorkOrderCommand } from './cancel-work-order.command';
import { CLOCK, WORK_ORDER_REPOSITORY } from '../../di/tokens';
import { WorkOrderNotFoundError } from '../../errors/application.errors';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(CancelWorkOrderCommand)
export class CancelWorkOrderHandler implements ICommandHandler<CancelWorkOrderCommand, void> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: CancelWorkOrderCommand): Promise<void> {
    const wo = await this.repo.findById(WorkOrderId.from(cmd.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(cmd.workOrderId);
    }

    wo.cancel(cmd.reason, cmd.by, this.clock.now());
    await this.repo.save(wo);
  }
}
