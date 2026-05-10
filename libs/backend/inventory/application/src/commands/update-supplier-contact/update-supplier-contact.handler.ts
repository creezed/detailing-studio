import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { ISupplierRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { UpdateSupplierContactCommand } from './update-supplier-contact.command';
import { CLOCK, SUPPLIER_REPOSITORY } from '../../di/tokens';
import { SupplierNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateSupplierContactCommand)
export class UpdateSupplierContactHandler implements ICommandHandler<
  UpdateSupplierContactCommand,
  void
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY) private readonly supplierRepo: ISupplierRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: UpdateSupplierContactCommand): Promise<void> {
    const supplier = await this.supplierRepo.findById(cmd.supplierId);

    if (!supplier) {
      throw new SupplierNotFoundError(cmd.supplierId);
    }

    supplier.updateContact(cmd.contact, this.clock.now());

    await this.supplierRepo.save(supplier);
  }
}
