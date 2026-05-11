import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import type { IClock } from '@det/backend-shared-ddd';
import { WorkOrderId } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { RemoveConsumptionLineCommand } from './remove-consumption-line.command';
import { CLOCK, WORK_ORDER_REPOSITORY } from '../../di/tokens';
import { WorkOrderNotFoundError } from '../../errors/application.errors';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(RemoveConsumptionLineCommand)
export class RemoveConsumptionLineHandler implements ICommandHandler<
  RemoveConsumptionLineCommand,
  void
> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: RemoveConsumptionLineCommand): Promise<void> {
    const wo = await this.repo.findById(WorkOrderId.from(cmd.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(cmd.workOrderId);
    }

    wo.removeConsumption(cmd.lineId, this.clock.now());
    await this.repo.save(wo);
  }
}
