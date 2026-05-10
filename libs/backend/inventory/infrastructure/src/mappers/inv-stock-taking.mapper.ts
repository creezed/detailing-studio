import { StockTaking, StockTakingId, StockTakingLine } from '@det/backend-inventory-domain';
import type { StockTakingStatus } from '@det/backend-inventory-domain';
import { DateTime, Quantity } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import { InvStockTakingSchema } from '../persistence/inv-stock-taking.schema';

import type { InvStockTakingLineSchema } from '../persistence/inv-stock-taking-line.schema';

export function mapStockTakingToDomain(schema: InvStockTakingSchema): StockTaking {
  const lines = schema.lines.getItems().map((l: InvStockTakingLineSchema) => {
    const unit = l.baseUnit as UnitOfMeasure;

    return StockTakingLine.restore(
      l.skuId as unknown as SkuId,
      Quantity.of(Number(l.expectedQuantity), unit),
      l.actualQuantity !== null ? Quantity.of(Number(l.actualQuantity), unit) : null,
    );
  });

  return StockTaking.restore(
    StockTakingId.from(schema.id),
    schema.branchId as unknown as BranchId,
    schema.status as StockTakingStatus,
    lines,
    schema.createdBy as unknown as UserId,
    DateTime.from(schema.startedAt.toISOString()),
    schema.completedAt !== null ? DateTime.from(schema.completedAt.toISOString()) : null,
  );
}

export function mapStockTakingToPersistence(
  domain: StockTaking,
  existing: InvStockTakingSchema | null,
): InvStockTakingSchema {
  const snap = domain.toSnapshot();
  const schema = existing ?? new InvStockTakingSchema();

  schema.id = snap.id;
  schema.branchId = snap.branchId;
  schema.status = snap.status;
  schema.createdBy = snap.createdBy;
  schema.startedAt = new Date(snap.startedAt);
  schema.completedAt = snap.completedAt !== null ? new Date(snap.completedAt) : null;

  return schema;
}
