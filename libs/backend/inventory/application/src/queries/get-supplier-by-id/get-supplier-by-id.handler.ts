import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { ISupplierRepository } from '@det/backend-inventory-domain';

import { GetSupplierByIdQuery } from './get-supplier-by-id.query';
import { SUPPLIER_REPOSITORY } from '../../di/tokens';
import { SupplierNotFoundError } from '../../errors/application.errors';

import type { SupplierDetailReadModel } from '../../read-models/supplier.read-models';

@QueryHandler(GetSupplierByIdQuery)
export class GetSupplierByIdHandler implements IQueryHandler<
  GetSupplierByIdQuery,
  SupplierDetailReadModel
> {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly supplierRepo: ISupplierRepository) {}

  async execute(query: GetSupplierByIdQuery): Promise<SupplierDetailReadModel> {
    const supplier = await this.supplierRepo.findById(query.supplierId);

    if (!supplier) {
      throw new SupplierNotFoundError(query.supplierId);
    }

    return supplier.toSnapshot();
  }
}
