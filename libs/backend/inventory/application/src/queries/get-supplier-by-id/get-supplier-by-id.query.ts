import type { SupplierId } from '@det/backend-inventory-domain';

export class GetSupplierByIdQuery {
  constructor(public readonly supplierId: SupplierId) {}
}
