import type { SupplierId } from './supplier-id';
import type { Supplier } from './supplier.aggregate';

export interface ISupplierRepository {
  findById(id: SupplierId): Promise<Supplier | null>;
  save(supplier: Supplier): Promise<void>;
}
