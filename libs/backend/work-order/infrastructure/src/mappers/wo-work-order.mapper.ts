import { DateTime } from '@det/backend-shared-ddd';
import { PhotoType, WorkOrder } from '@det/backend-work-order-domain';
import type {
  ConsumptionLineSnapshot,
  MaterialNormSnapshotData,
  PhotoRef,
  WorkOrderServiceSnapshotData,
  WorkOrderSnapshot,
} from '@det/backend-work-order-domain';
import type { PhotoId, UserId } from '@det/shared-types';

import { WoConsumptionLineSchema } from '../persistence/wo-consumption-line.schema';
import { WoPhotoSchema } from '../persistence/wo-photo.schema';
import { WoWorkOrderSchema } from '../persistence/wo-work-order.schema';

export function mapWorkOrderToDomain(schema: WoWorkOrderSchema): WorkOrder {
  const lines: ConsumptionLineSnapshot[] = schema.lines.getItems().map((l) => ({
    id: l.id,
    skuId: l.skuId,
    actualAmount: l.actualAmount,
    actualUnit: l.actualUnit,
    normAmount: l.normAmount,
    normUnit: l.normUnit,
    deviationReason: l.deviationReason,
    comment: l.comment,
  }));

  const photos = schema.photos.getItems();

  const photosBefore: PhotoRef[] = photos
    .filter((p) => p.type === PhotoType.BEFORE)
    .map((p) => ({
      id: p.id as PhotoId,
      type: PhotoType.BEFORE,
      url: p.url,
      thumbnailUrl: p.thumbnailUrl,
      mime: p.mime,
      sizeBytes: p.sizeBytes,
      uploadedBy: p.uploadedBy as UserId,
      uploadedAt: DateTime.from(p.uploadedAt.toISOString()),
    }));

  const photosAfter: PhotoRef[] = photos
    .filter((p) => p.type === PhotoType.AFTER)
    .map((p) => ({
      id: p.id as PhotoId,
      type: PhotoType.AFTER,
      url: p.url,
      thumbnailUrl: p.thumbnailUrl,
      mime: p.mime,
      sizeBytes: p.sizeBytes,
      uploadedBy: p.uploadedBy as UserId,
      uploadedAt: DateTime.from(p.uploadedAt.toISOString()),
    }));

  const snapshot: WorkOrderSnapshot = {
    id: schema.id,
    appointmentId: schema.appointmentId,
    branchId: schema.branchId,
    masterId: schema.masterId,
    clientId: schema.clientId,
    vehicleId: schema.vehicleId,
    services: schema.services as unknown as readonly WorkOrderServiceSnapshotData[],
    norms: schema.norms as unknown as readonly MaterialNormSnapshotData[],
    lines,
    photosBefore,
    photosAfter,
    status: schema.status,
    openedAt: schema.openedAt.toISOString(),
    closedAt: schema.closedAt ? schema.closedAt.toISOString() : null,
    cancellationReason: schema.cancellationReason,
    version: schema.version,
  };

  return WorkOrder.restore(snapshot);
}

export function mapWorkOrderToPersistence(
  domain: WorkOrder,
  existing: WoWorkOrderSchema | null,
): WoWorkOrderSchema {
  const schema = existing ?? new WoWorkOrderSchema();
  const snap = domain.toSnapshot();

  schema.id = snap.id;
  schema.appointmentId = snap.appointmentId;
  schema.branchId = snap.branchId;
  schema.masterId = snap.masterId;
  schema.clientId = snap.clientId;
  schema.vehicleId = snap.vehicleId;
  schema.status = snap.status;
  schema.services = snap.services as unknown as readonly Record<string, unknown>[];
  schema.norms = snap.norms as unknown as readonly Record<string, unknown>[];
  schema.openedAt = new Date(snap.openedAt);
  schema.closedAt = snap.closedAt ? new Date(snap.closedAt) : null;
  schema.cancellationReason = snap.cancellationReason;

  return schema;
}

export function syncConsumptionLines(
  snap: WorkOrderSnapshot,
  woSchema: WoWorkOrderSchema,
): { toRemove: WoConsumptionLineSchema[]; toUpsert: WoConsumptionLineSchema[] } {
  const existing = woSchema.lines.isInitialized() ? woSchema.lines.getItems() : [];
  const existingMap = new Map(existing.map((e) => [e.id, e]));
  const snapIds = new Set(snap.lines.map((l) => l.id));

  const toRemove = existing.filter((e) => !snapIds.has(e.id));
  const toUpsert: WoConsumptionLineSchema[] = [];

  for (const line of snap.lines) {
    const ls = existingMap.get(line.id) ?? new WoConsumptionLineSchema();
    ls.id = line.id;
    ls.workOrder = woSchema;
    ls.skuId = line.skuId;
    ls.actualAmount = line.actualAmount;
    ls.actualUnit = line.actualUnit;
    ls.normAmount = line.normAmount;
    ls.normUnit = line.normUnit;
    ls.deviationReason = line.deviationReason;
    ls.comment = line.comment;
    toUpsert.push(ls);
  }

  return { toRemove, toUpsert };
}

export function syncPhotos(
  snap: WorkOrderSnapshot,
  woSchema: WoWorkOrderSchema,
): { toRemove: WoPhotoSchema[]; toUpsert: WoPhotoSchema[] } {
  const existing = woSchema.photos.isInitialized() ? woSchema.photos.getItems() : [];
  const existingMap = new Map(existing.map((e) => [e.id, e]));
  const allPhotos = [...snap.photosBefore, ...snap.photosAfter];
  const snapIds = new Set(allPhotos.map((p) => p.id as string));

  const toRemove = existing.filter((e) => !snapIds.has(e.id));
  const toUpsert: WoPhotoSchema[] = [];

  for (const photo of allPhotos) {
    const ps = existingMap.get(photo.id) ?? new WoPhotoSchema();
    ps.id = photo.id;
    ps.workOrder = woSchema;
    ps.type = photo.type;
    ps.url = photo.url;
    ps.thumbnailUrl = photo.thumbnailUrl;
    ps.mime = photo.mime;
    ps.sizeBytes = photo.sizeBytes;
    ps.uploadedBy = photo.uploadedBy;
    ps.uploadedAt = photo.uploadedAt.toDate();
    toUpsert.push(ps);
  }

  return { toRemove, toUpsert };
}
