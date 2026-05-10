import { Stock } from '@det/backend-inventory-domain';
import type { BatchSourceType, StockSnapshot } from '@det/backend-inventory-domain';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';

import { InvStockSchema } from '../persistence/inv-stock.schema';

import type { InvBatchSchema } from '../persistence/inv-batch.schema';

export function mapStockToDomain(schema: InvStockSchema): Stock {
  const baseUnit = schema.baseUnit as UnitOfMeasure;
  const snapshot: StockSnapshot = {
    averageCostCents: schema.averageCostCents,
    baseUnit,
    batches: schema.batches.getItems().map((b: InvBatchSchema) => ({
      expiresAt: b.expiresAt !== null ? b.expiresAt.toISOString().slice(0, 10) : null,
      id: b.id,
      initialQuantity: Number(b.initialQuantity),
      receivedAt: b.receivedAt.toISOString(),
      remainingQuantity: Number(b.remainingQuantity),
      sourceDocId: b.sourceDocId,
      sourceType: b.sourceType as BatchSourceType,
      supplierId: b.supplierId,
      unitCostCents: b.unitCostCents,
    })),
    branchId: schema.branchId,
    reorderLevel: Number(schema.reorderLevel),
    skuId: schema.skuId,
  };

  return Stock.restore(snapshot);
}

export function mapStockToPersistence(
  domain: Stock,
  existing: InvStockSchema | null,
): InvStockSchema {
  const schema = existing ?? new InvStockSchema();
  const snap = domain.toSnapshot();

  schema.id = `${snap.skuId}::${snap.branchId}`;
  schema.skuId = snap.skuId;
  schema.branchId = snap.branchId;
  schema.baseUnit = snap.baseUnit;
  schema.reorderLevel = snap.reorderLevel.toString();
  schema.averageCostCents = snap.averageCostCents;
  schema.updatedAt = new Date();

  return schema;
}
