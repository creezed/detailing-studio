import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { ISkuRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { DeactivateSkuCommand } from './deactivate-sku.command';
import { CLOCK, SKU_REPOSITORY } from '../../di/tokens';
import { SkuNotFoundError } from '../../errors/application.errors';

@CommandHandler(DeactivateSkuCommand)
export class DeactivateSkuHandler implements ICommandHandler<DeactivateSkuCommand, void> {
  constructor(
    @Inject(SKU_REPOSITORY) private readonly skuRepo: ISkuRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: DeactivateSkuCommand): Promise<void> {
    const sku = await this.skuRepo.findById(cmd.skuId);

    if (!sku) {
      throw new SkuNotFoundError(cmd.skuId);
    }

    sku.deactivate(this.clock.now());

    await this.skuRepo.save(sku);
  }
}
