import {
  Adjustment,
  AdjustmentId,
  AdjustmentLine,
  SignedQuantity,
} from '@det/backend-inventory-domain';
import type { AdjustmentStatus } from '@det/backend-inventory-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, UserId } from '@det/shared-types';

import { moneyFromCentsStr } from './money.helper';
import { InvAdjustmentSchema } from '../persistence/inv-adjustment.schema';

import type { InvAdjustmentLineSchema } from '../persistence/inv-adjustment-line.schema';

export function mapAdjustmentToDomain(schema: InvAdjustmentSchema): Adjustment {
  const lines = schema.lines
    .getItems()
    .map((l: InvAdjustmentLineSchema) =>
      AdjustmentLine.create(
        l.skuId as unknown as ReturnType<typeof AdjustmentLine.create>['skuId'],
        SignedQuantity.of(Number(l.delta), 'PCS' as UnitOfMeasure),
        moneyFromCentsStr(l.snapshotUnitCostCents),
      ),
    );

  return Adjustment.restore(
    AdjustmentId.from(schema.id),
    schema.branchId as unknown as BranchId,
    schema.status as AdjustmentStatus,
    schema.reason,
    lines,
    BigInt(schema.totalAmountCents),
    schema.createdBy as unknown as UserId,
    schema.approvedBy !== null ? (schema.approvedBy as unknown as UserId) : null,
    DateTime.from(schema.createdAt.toISOString()),
    schema.approvedAt !== null ? DateTime.from(schema.approvedAt.toISOString()) : null,
  );
}

export function mapAdjustmentToPersistence(
  domain: Adjustment,
  existing: InvAdjustmentSchema | null,
): InvAdjustmentSchema {
  const snap = domain.toSnapshot();
  const schema = existing ?? new InvAdjustmentSchema();

  schema.id = snap.id;
  schema.branchId = snap.branchId;
  schema.status = snap.status;
  schema.reason = snap.reason;
  schema.totalAmountCents = snap.totalAmountCents;
  schema.createdBy = snap.createdBy;
  schema.approvedBy = snap.approvedBy;
  schema.createdAt = new Date(snap.createdAt);
  schema.approvedAt = snap.approvedAt !== null ? new Date(snap.approvedAt) : null;

  return schema;
}
