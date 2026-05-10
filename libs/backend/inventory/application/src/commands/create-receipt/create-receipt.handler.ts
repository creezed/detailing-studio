import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Receipt, ReceiptId } from '@det/backend-inventory-domain';
import type { IReceiptRepository } from '@det/backend-inventory-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateReceiptCommand } from './create-receipt.command';
import { CLOCK, ID_GENERATOR, RECEIPT_REPOSITORY } from '../../di/tokens';

@CommandHandler(CreateReceiptCommand)
export class CreateReceiptHandler implements ICommandHandler<
  CreateReceiptCommand,
  { id: ReceiptId }
> {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly receiptRepo: IReceiptRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: CreateReceiptCommand): Promise<{ id: ReceiptId }> {
    const receipt = Receipt.create({
      branchId: cmd.branchId,
      createdAt: this.clock.now(),
      createdBy: cmd.createdBy,
      id: ReceiptId.generate(this.idGen),
      supplierId: cmd.supplierId,
      supplierInvoiceDate:
        cmd.supplierInvoiceDate !== null ? DateTime.from(cmd.supplierInvoiceDate) : null,
      supplierInvoiceNumber: cmd.supplierInvoiceNumber,
    });

    await this.receiptRepo.save(receipt);

    return { id: receipt.id };
  }
}
