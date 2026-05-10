import { Sku } from '@det/backend-inventory-domain';
import type { SkuSnapshot } from '@det/backend-inventory-domain';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';

import { InvSkuSchema } from '../persistence/inv-sku.schema';

import type { InvPackagingSchema } from '../persistence/inv-packaging.schema';

export function mapSkuToDomain(schema: InvSkuSchema): Sku {
  const snapshot: SkuSnapshot = {
    articleNumber: schema.articleNumber,
    barcode: schema.barcode,
    baseUnit: schema.baseUnit as UnitOfMeasure,
    description: schema.descriptionMd,
    group: schema.group,
    hasExpiry: schema.hasExpiry,
    id: schema.id,
    isActive: schema.isActive,
    name: schema.name,
    packagings: schema.packagings.getItems().map((p: InvPackagingSchema) => ({
      coefficient: p.coefficient,
      id: p.id,
      name: p.name,
    })),
    photoUrl: schema.photoUrl,
  };

  return Sku.restore(snapshot);
}

export function mapSkuToPersistence(domain: Sku, existing: InvSkuSchema | null): InvSkuSchema {
  const schema = existing ?? new InvSkuSchema();
  const snap = domain.toSnapshot();

  schema.id = snap.id;
  schema.articleNumber = snap.articleNumber;
  schema.name = snap.name;
  schema.group = snap.group;
  schema.baseUnit = snap.baseUnit;
  schema.barcode = snap.barcode;
  schema.hasExpiry = snap.hasExpiry;
  schema.photoUrl = snap.photoUrl;
  schema.isActive = snap.isActive;
  schema.descriptionMd = snap.description;
  if (!existing) {
    schema.createdAt = new Date();
  }

  return schema;
}
