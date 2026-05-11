import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import type { IClock } from '@det/backend-shared-ddd';
import { WorkOrderId } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { UpdateConsumptionLineCommand } from './update-consumption-line.command';
import { CLOCK, WORK_ORDER_REPOSITORY } from '../../di/tokens';
import { WorkOrderNotFoundError } from '../../errors/application.errors';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(UpdateConsumptionLineCommand)
export class UpdateConsumptionLineHandler implements ICommandHandler<
  UpdateConsumptionLineCommand,
  void
> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: UpdateConsumptionLineCommand): Promise<void> {
    const wo = await this.repo.findById(WorkOrderId.from(cmd.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(cmd.workOrderId);
    }

    wo.updateConsumption(
      cmd.lineId,
      cmd.actualAmount,
      this.clock.now(),
      cmd.deviationReason,
      cmd.comment,
    );

    await this.repo.save(wo);
  }
}
