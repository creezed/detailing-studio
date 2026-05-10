import type { SupplierId } from '@det/backend-inventory-domain';

export class UpdateSupplierContactCommand {
  constructor(
    public readonly supplierId: SupplierId,
    public readonly contact: {
      readonly phone: string | null;
      readonly email: string | null;
      readonly address: string | null;
    },
  ) {}
}
