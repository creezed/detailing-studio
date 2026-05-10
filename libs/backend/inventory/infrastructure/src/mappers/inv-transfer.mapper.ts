import { Transfer, TransferId, TransferLine } from '@det/backend-inventory-domain';
import type { TransferStatus } from '@det/backend-inventory-domain';
import { DateTime, Quantity } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import { InvTransferSchema } from '../persistence/inv-transfer.schema';

import type { InvTransferLineSchema } from '../persistence/inv-transfer-line.schema';

export function mapTransferToDomain(schema: InvTransferSchema): Transfer {
  const lines = schema.lines
    .getItems()
    .map((l: InvTransferLineSchema) =>
      TransferLine.create(
        l.skuId as unknown as SkuId,
        Quantity.of(Number(l.quantity), l.baseUnit as UnitOfMeasure),
      ),
    );

  return Transfer.restore(
    TransferId.from(schema.id),
    schema.fromBranchId as unknown as BranchId,
    schema.toBranchId as unknown as BranchId,
    schema.status as TransferStatus,
    lines,
    schema.createdBy as unknown as UserId,
    DateTime.from(schema.createdAt.toISOString()),
    schema.postedBy !== null ? (schema.postedBy as unknown as UserId) : null,
    schema.postedAt !== null ? DateTime.from(schema.postedAt.toISOString()) : null,
  );
}

export function mapTransferToPersistence(
  domain: Transfer,
  existing: InvTransferSchema | null,
): InvTransferSchema {
  const snap = domain.toSnapshot();
  const schema = existing ?? new InvTransferSchema();

  schema.id = snap.id;
  schema.fromBranchId = snap.fromBranchId;
  schema.toBranchId = snap.toBranchId;
  schema.status = snap.status;
  schema.createdBy = snap.createdBy;
  schema.createdAt = new Date(snap.createdAt);
  schema.postedBy = snap.postedBy;
  schema.postedAt = snap.postedAt !== null ? new Date(snap.postedAt) : null;

  return schema;
}
