import { Receipt, ReceiptId, ReceiptLine } from '@det/backend-inventory-domain';
import type { ReceiptStatus } from '@det/backend-inventory-domain';
import { DateTime, Quantity } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, SupplierId, UserId } from '@det/shared-types';

import { moneyFromCentsStr } from './money.helper';
import { InvReceiptLineSchema } from '../persistence/inv-receipt-line.schema';
import { InvReceiptSchema } from '../persistence/inv-receipt.schema';

export function mapReceiptToDomain(schema: InvReceiptSchema): Receipt {
  const lines = schema.lines.getItems().map((l: InvReceiptLineSchema) =>
    ReceiptLine.create({
      baseQuantity: Quantity.of(Number(l.baseQuantity), 'PCS' as UnitOfMeasure),
      expiresAt: l.expiresAt !== null ? DateTime.from(l.expiresAt.toISOString()) : null,
      id: l.id,
      packageQuantity: Number(l.packageQuantity),
      packagingId: l.packagingId,
      skuId: l.skuId as unknown as SkuId,
      unitCost: moneyFromCentsStr(l.unitCostCents),
    }),
  );

  return Receipt.restore(
    ReceiptId.from(schema.id),
    schema.supplierId as unknown as SupplierId,
    schema.branchId as unknown as BranchId,
    schema.status as ReceiptStatus,
    lines,
    schema.supplierInvoiceNumber,
    schema.supplierInvoiceDate !== null
      ? DateTime.from(schema.supplierInvoiceDate.toISOString())
      : null,
    schema.attachmentUrl,
    schema.createdBy as unknown as UserId,
    schema.postedBy !== null ? (schema.postedBy as unknown as UserId) : null,
    DateTime.from(schema.createdAt.toISOString()),
    schema.postedAt !== null ? DateTime.from(schema.postedAt.toISOString()) : null,
  );
}

export function mapReceiptToPersistence(
  domain: Receipt,
  existing: InvReceiptSchema | null,
): InvReceiptSchema {
  const snap = domain.toSnapshot();
  const schema = existing ?? new InvReceiptSchema();

  schema.id = snap.id;
  schema.supplierId = snap.supplierId;
  schema.branchId = snap.branchId;
  schema.status = snap.status;
  schema.supplierInvoiceNumber = snap.supplierInvoiceNumber;
  schema.supplierInvoiceDate =
    snap.supplierInvoiceDate !== null ? new Date(snap.supplierInvoiceDate) : null;
  schema.attachmentUrl = snap.attachmentUrl;
  schema.createdBy = snap.createdBy;
  schema.postedBy = snap.postedBy;
  schema.createdAt = new Date(snap.createdAt);
  schema.postedAt = snap.postedAt !== null ? new Date(snap.postedAt) : null;

  return schema;
}

export function mapReceiptLineToPersistence(
  line: ReceiptLine,
  receiptSchema: InvReceiptSchema,
): InvReceiptLineSchema {
  const ls = new InvReceiptLineSchema();

  ls.id = line.id;
  ls.receipt = receiptSchema;
  ls.skuId = line.skuId;
  ls.packagingId = line.packagingId;
  ls.packageQuantity = line.packageQuantity.toString();
  ls.baseQuantity = line.baseQuantity.amount.toString();
  ls.unitCostCents = line.unitCost.cents.toString();
  ls.expiresAt = line.expiresAt !== null ? new Date(line.expiresAt.iso()) : null;

  return ls;
}
