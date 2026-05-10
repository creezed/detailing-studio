import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  Adjustment,
  AdjustmentId,
  AdjustmentLine,
  AdjustmentStatus,
} from '@det/backend-inventory-domain';
import type { IAdjustmentRepository } from '@det/backend-inventory-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateAdjustmentCommand } from './create-adjustment.command';
import { ADJUSTMENT_REPOSITORY, CLOCK, ID_GENERATOR, INVENTORY_CONFIG_PORT } from '../../di/tokens';

import type { IInventoryConfigPort } from '../../ports/inventory-config.port';

@CommandHandler(CreateAdjustmentCommand)
export class CreateAdjustmentHandler implements ICommandHandler<
  CreateAdjustmentCommand,
  { id: AdjustmentId; status: AdjustmentStatus }
> {
  constructor(
    @Inject(ADJUSTMENT_REPOSITORY) private readonly adjustmentRepo: IAdjustmentRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(INVENTORY_CONFIG_PORT) private readonly config: IInventoryConfigPort,
  ) {}

  async execute(
    cmd: CreateAdjustmentCommand,
  ): Promise<{ id: AdjustmentId; status: AdjustmentStatus }> {
    const lines = cmd.lines.map((l) => AdjustmentLine.create(l.skuId, l.delta, l.snapshotUnitCost));

    const adjustment = Adjustment.create({
      autoApprovalThreshold: this.config.adjustmentAutoApprovalThreshold(),
      branchId: cmd.branchId,
      createdAt: this.clock.now(),
      createdBy: cmd.createdBy,
      id: AdjustmentId.generate(this.idGen),
      lines,
      reason: cmd.reason,
    });

    await this.adjustmentRepo.save(adjustment);

    return { id: adjustment.id, status: adjustment.status };
  }
}
