import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { WorkOrderId } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { AddConsumptionCommand } from './add-consumption.command';
import { CLOCK, ID_GENERATOR, WORK_ORDER_REPOSITORY } from '../../di/tokens';
import { WorkOrderNotFoundError } from '../../errors/application.errors';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(AddConsumptionCommand)
export class AddConsumptionHandler implements ICommandHandler<AddConsumptionCommand, void> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: IWorkOrderRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: AddConsumptionCommand): Promise<void> {
    const wo = await this.repo.findById(WorkOrderId.from(cmd.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(cmd.workOrderId);
    }

    wo.addConsumption(
      cmd.skuId,
      cmd.actualAmount,
      this.clock.now(),
      this.idGen,
      cmd.deviationReason,
      cmd.comment,
    );

    await this.repo.save(wo);
  }
}
