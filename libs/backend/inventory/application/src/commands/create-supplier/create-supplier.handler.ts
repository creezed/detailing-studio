import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Inn, Supplier, SupplierId } from '@det/backend-inventory-domain';
import type { ISupplierRepository } from '@det/backend-inventory-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateSupplierCommand } from './create-supplier.command';
import { CLOCK, ID_GENERATOR, SUPPLIER_REPOSITORY } from '../../di/tokens';

@CommandHandler(CreateSupplierCommand)
export class CreateSupplierHandler implements ICommandHandler<
  CreateSupplierCommand,
  { id: SupplierId }
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY) private readonly supplierRepo: ISupplierRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: CreateSupplierCommand): Promise<{ id: SupplierId }> {
    const inn = cmd.inn !== null ? Inn.from(cmd.inn) : null;

    const supplier = Supplier.create({
      contact: cmd.contact,
      idGen: this.idGen,
      inn,
      name: cmd.name,
      now: this.clock.now(),
    });

    await this.supplierRepo.save(supplier);

    return { id: supplier.id };
  }
}
