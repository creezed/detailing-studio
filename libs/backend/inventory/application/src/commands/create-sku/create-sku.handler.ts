import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { ArticleNumber, Barcode, Packaging, Sku, SkuId } from '@det/backend-inventory-domain';
import type { ISkuRepository } from '@det/backend-inventory-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateSkuCommand } from './create-sku.command';
import { CLOCK, ID_GENERATOR, SKU_REPOSITORY } from '../../di/tokens';
import {
  ArticleNumberAlreadyExistsError,
  BarcodeAlreadyExistsError,
} from '../../errors/application.errors';

@CommandHandler(CreateSkuCommand)
export class CreateSkuHandler implements ICommandHandler<CreateSkuCommand, { id: SkuId }> {
  constructor(
    @Inject(SKU_REPOSITORY) private readonly skuRepo: ISkuRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: CreateSkuCommand): Promise<{ id: SkuId }> {
    const articleNumber = ArticleNumber.from(cmd.articleNumber);

    if (await this.skuRepo.findByArticleNumber(articleNumber)) {
      throw new ArticleNumberAlreadyExistsError(cmd.articleNumber);
    }

    const barcode = cmd.barcode !== null ? Barcode.from(cmd.barcode) : null;

    if (barcode && (await this.skuRepo.findByBarcode(barcode))) {
      throw new BarcodeAlreadyExistsError(barcode.getValue());
    }

    const packagings = cmd.packagings.map((p) => Packaging.create(p.id, p.name, p.coefficient));

    const sku = Sku.create({
      articleNumber: cmd.articleNumber,
      barcode,
      baseUnit: cmd.baseUnit,
      description: cmd.description,
      group: cmd.group,
      hasExpiry: cmd.hasExpiry,
      idGen: this.idGen,
      name: cmd.name,
      now: this.clock.now(),
      packagings,
      photoUrl: cmd.photoUrl,
    });

    await this.skuRepo.save(sku);

    return { id: sku.id };
  }
}
