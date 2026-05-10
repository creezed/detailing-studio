import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Packaging } from '@det/backend-inventory-domain';
import type { ISkuRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { UpdateSkuCommand } from './update-sku.command';
import { CLOCK, SKU_REPOSITORY } from '../../di/tokens';
import { SkuNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateSkuCommand)
export class UpdateSkuHandler implements ICommandHandler<UpdateSkuCommand, void> {
  constructor(
    @Inject(SKU_REPOSITORY) private readonly skuRepo: ISkuRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: UpdateSkuCommand): Promise<void> {
    const sku = await this.skuRepo.findById(cmd.skuId);

    if (!sku) {
      throw new SkuNotFoundError(cmd.skuId);
    }

    const now = this.clock.now();

    if (cmd.name !== undefined) {
      sku.rename(cmd.name, now);
    }

    if (cmd.group !== undefined) {
      sku.changeGroup(cmd.group, now);
    }

    if (cmd.packagings !== undefined) {
      const packagings = cmd.packagings.map((p) => Packaging.create(p.id, p.name, p.coefficient));

      sku.updatePackagings(packagings, now);
    }

    await this.skuRepo.save(sku);
  }
}
