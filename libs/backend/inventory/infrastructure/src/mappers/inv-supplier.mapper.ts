import { Supplier } from '@det/backend-inventory-domain';

import { InvSupplierSchema } from '../persistence/inv-supplier.schema';

export function mapSupplierToDomain(schema: InvSupplierSchema): Supplier {
  return Supplier.restore({
    contact: {
      address: schema.address,
      email: schema.contactEmail,
      phone: schema.contactPhone,
    },
    id: schema.id,
    inn: schema.inn,
    isActive: schema.isActive,
    name: schema.name,
  });
}

export function mapSupplierToPersistence(
  domain: Supplier,
  existing: InvSupplierSchema | null,
): InvSupplierSchema {
  const schema = existing ?? new InvSupplierSchema();
  const snap = domain.toSnapshot();

  schema.id = snap.id;
  schema.name = snap.name;
  schema.inn = snap.inn;
  schema.contactName = snap.contact.phone;
  schema.contactPhone = snap.contact.phone;
  schema.contactEmail = snap.contact.email;
  schema.address = snap.contact.address;
  schema.isActive = snap.isActive;

  return schema;
}
