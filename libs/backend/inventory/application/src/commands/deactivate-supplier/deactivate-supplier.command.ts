import type { SupplierId } from '@det/backend-inventory-domain';

export class DeactivateSupplierCommand {
  constructor(public readonly supplierId: SupplierId) {}
}
