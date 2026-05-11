import { AggregateRoot, DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator, Quantity } from '@det/backend-shared-ddd';

import { ConsumptionLine } from './consumption-line.entity';
import { canTransition } from './state-transitions';
import {
  ConsumptionLineNotFoundError,
  EmptyReopenReasonError,
  InvalidOperationError,
  InvalidStateTransitionError,
  PhotoLimitExceededError,
  ServicesEmptyError,
  WorkOrderClosingValidationError,
} from './work-order.errors';
import {
  WorkOrderCancelled,
  WorkOrderClosed,
  WorkOrderClosingReverted,
  WorkOrderClosingStarted,
  WorkOrderConsumptionAdded,
  WorkOrderConsumptionRemoved,
  WorkOrderConsumptionUpdated,
  WorkOrderOpened,
  WorkOrderPhotoAdded,
  WorkOrderPhotoRemoved,
  WorkOrderReopened,
  WorkOrderReturnedToInProgress,
  WorkOrderSubmittedForReview,
} from './work-order.events';
import { validatePhotoRef } from '../value-objects/photo-ref.value-object';
import { PhotoType } from '../value-objects/photo-type';
import { WorkOrderId } from '../value-objects/work-order-id';
import { WorkOrderStatus } from '../value-objects/work-order-status';

import type { ConsumptionLineSnapshot } from './consumption-line.entity';
import type { ClosedConsumptionLineData, MaterialNormSnapshotData } from './work-order.events';
import type { ClosingValidator } from '../services/closing-validator';
import type { MaterialNormSnapshot } from '../value-objects/material-norm-snapshot';
import type { PhotoRef } from '../value-objects/photo-ref.value-object';
import type {
  WorkOrderServiceSnapshot,
  WorkOrderServiceSnapshotData,
} from '../value-objects/work-order-service-snapshot';

const MAX_PHOTOS_PER_TYPE = 20;

export interface OpenFromAppointmentProps {
  readonly appointmentId: string;
  readonly branchId: string;
  readonly masterId: string;
  readonly clientId: string;
  readonly vehicleId: string;
  readonly services: readonly WorkOrderServiceSnapshot[];
  readonly norms: readonly MaterialNormSnapshot[];
  readonly openedAt: DateTime;
  readonly idGen: IIdGenerator;
}

export interface WorkOrderSnapshot {
  readonly id: string;
  readonly appointmentId: string;
  readonly branchId: string;
  readonly masterId: string;
  readonly clientId: string;
  readonly vehicleId: string;
  readonly services: readonly WorkOrderServiceSnapshotData[];
  readonly norms: readonly MaterialNormSnapshotData[];
  readonly lines: readonly ConsumptionLineSnapshot[];
  readonly photosBefore: readonly PhotoRef[];
  readonly photosAfter: readonly PhotoRef[];
  readonly status: WorkOrderStatus;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly cancellationReason: string | null;
  readonly version: number;
}

export class WorkOrder extends AggregateRoot<WorkOrderId> {
  private constructor(
    private readonly _id: WorkOrderId,
    private readonly _appointmentId: string,
    private readonly _branchId: string,
    private readonly _masterId: string,
    private readonly _clientId: string,
    private readonly _vehicleId: string,
    private readonly _services: readonly WorkOrderServiceSnapshotData[],
    private readonly _normsSnapshot: readonly MaterialNormSnapshotData[],
    private readonly _lines: ConsumptionLine[],
    private readonly _photosBefore: PhotoRef[],
    private readonly _photosAfter: PhotoRef[],
    private _status: WorkOrderStatus,
    private readonly _openedAt: DateTime,
    private _closedAt: DateTime | null,
    private _cancellationReason: string | null,
    private readonly _version: number,
  ) {
    super();
  }

  override get id(): WorkOrderId {
    return this._id;
  }

  get status(): WorkOrderStatus {
    return this._status;
  }

  get appointmentId(): string {
    return this._appointmentId;
  }

  static openFromAppointment(props: OpenFromAppointmentProps): WorkOrder {
    if (props.services.length === 0) {
      throw new ServicesEmptyError();
    }

    const serviceSnapshots: WorkOrderServiceSnapshotData[] = props.services.map((s) => ({
      serviceId: s.serviceId,
      serviceNameSnapshot: s.serviceNameSnapshot,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceSnapshot.cents,
    }));

    const normSnapshots: MaterialNormSnapshotData[] = props.norms.map((n) => ({
      skuId: n.skuId,
      skuNameSnapshot: n.skuNameSnapshot,
      normAmount: n.normAmount.amount,
      normUnit: n.normAmount.unit,
    }));

    const lines = props.norms.map((n) => ConsumptionLine.draft(n.skuId, n.normAmount, props.idGen));

    const wo = new WorkOrder(
      WorkOrderId.generate(props.idGen),
      props.appointmentId,
      props.branchId,
      props.masterId,
      props.clientId,
      props.vehicleId,
      serviceSnapshots,
      normSnapshots,
      lines,
      [],
      [],
      WorkOrderStatus.OPEN,
      props.openedAt,
      null,
      null,
      0,
    );

    wo.addEvent(
      new WorkOrderOpened(
        wo.id,
        props.appointmentId,
        props.branchId,
        props.masterId,
        props.clientId,
        props.vehicleId,
        serviceSnapshots,
        normSnapshots,
        props.openedAt,
      ),
    );

    return wo;
  }

  static restore(snapshot: WorkOrderSnapshot): WorkOrder {
    return new WorkOrder(
      WorkOrderId.from(snapshot.id),
      snapshot.appointmentId,
      snapshot.branchId,
      snapshot.masterId,
      snapshot.clientId,
      snapshot.vehicleId,
      snapshot.services,
      snapshot.norms,
      snapshot.lines.map((l) => ConsumptionLine.restore(l)),
      [...snapshot.photosBefore],
      [...snapshot.photosAfter],
      snapshot.status,
      DateTime.from(snapshot.openedAt),
      snapshot.closedAt ? DateTime.from(snapshot.closedAt) : null,
      snapshot.cancellationReason,
      snapshot.version,
    );
  }

  addPhotoBefore(photo: PhotoRef, now: DateTime): void {
    this.assertStatusIn([
      WorkOrderStatus.OPEN,
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.AWAITING_REVIEW,
    ]);
    validatePhotoRef(photo);
    if (this._photosBefore.length >= MAX_PHOTOS_PER_TYPE) {
      throw new PhotoLimitExceededError(PhotoType.BEFORE, MAX_PHOTOS_PER_TYPE);
    }
    this._photosBefore.push(photo);
    this.autoTransitionToInProgress();
    this.addEvent(new WorkOrderPhotoAdded(this._id, photo.id, PhotoType.BEFORE, photo.url, now));
  }

  addPhotoAfter(photo: PhotoRef, now: DateTime): void {
    this.assertStatusIn([
      WorkOrderStatus.OPEN,
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.AWAITING_REVIEW,
    ]);
    validatePhotoRef(photo);
    if (this._photosAfter.length >= MAX_PHOTOS_PER_TYPE) {
      throw new PhotoLimitExceededError(PhotoType.AFTER, MAX_PHOTOS_PER_TYPE);
    }
    this._photosAfter.push(photo);
    this.autoTransitionToInProgress();
    this.addEvent(new WorkOrderPhotoAdded(this._id, photo.id, PhotoType.AFTER, photo.url, now));
  }

  removePhoto(photoId: string, now: DateTime): void {
    this.assertStatusIn([
      WorkOrderStatus.OPEN,
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.AWAITING_REVIEW,
    ]);

    const beforeIdx = this._photosBefore.findIndex((p) => p.id === photoId);
    if (beforeIdx >= 0) {
      this._photosBefore.splice(beforeIdx, 1);
      this.addEvent(new WorkOrderPhotoRemoved(this._id, photoId, PhotoType.BEFORE, now));
      return;
    }

    const afterIdx = this._photosAfter.findIndex((p) => p.id === photoId);
    if (afterIdx >= 0) {
      this._photosAfter.splice(afterIdx, 1);
      this.addEvent(new WorkOrderPhotoRemoved(this._id, photoId, PhotoType.AFTER, now));
      return;
    }

    throw new InvalidOperationError(`Photo ${photoId} not found`);
  }

  addConsumption(
    skuId: string,
    actualAmount: Quantity,
    now: DateTime,
    idGen: IIdGenerator,
    deviationReason?: string,
    comment?: string,
  ): void {
    this.assertStatusIn([WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS]);

    const existing = this._lines.find((l) => l.skuId === skuId);
    if (existing) {
      existing.update(actualAmount, deviationReason, comment);
      this.addEvent(
        new WorkOrderConsumptionUpdated(
          this._id,
          existing.id,
          actualAmount.amount,
          actualAmount.unit,
          now,
        ),
      );
    } else {
      const line = ConsumptionLine.create(skuId, actualAmount, idGen, deviationReason, comment);
      this._lines.push(line);
      this.addEvent(
        new WorkOrderConsumptionAdded(
          this._id,
          line.id,
          skuId,
          actualAmount.amount,
          actualAmount.unit,
          now,
        ),
      );
    }

    this.autoTransitionToInProgress();
  }

  updateConsumption(
    lineId: string,
    actualAmount: Quantity,
    now: DateTime,
    deviationReason?: string,
    comment?: string,
  ): void {
    this.assertStatusIn([
      WorkOrderStatus.OPEN,
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.AWAITING_REVIEW,
    ]);

    const line = this._lines.find((l) => l.id === lineId);
    if (!line) {
      throw new ConsumptionLineNotFoundError(lineId);
    }

    line.update(actualAmount, deviationReason, comment);
    this.addEvent(
      new WorkOrderConsumptionUpdated(
        this._id,
        lineId,
        actualAmount.amount,
        actualAmount.unit,
        now,
      ),
    );
  }

  removeConsumption(lineId: string, now: DateTime): void {
    this.assertStatusIn([
      WorkOrderStatus.OPEN,
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.AWAITING_REVIEW,
    ]);

    const idx = this._lines.findIndex((l) => l.id === lineId);
    if (idx < 0) {
      throw new ConsumptionLineNotFoundError(lineId);
    }

    this._lines.splice(idx, 1);
    this.addEvent(new WorkOrderConsumptionRemoved(this._id, lineId, now));
  }

  submitForReview(by: string, now: DateTime): void {
    this.assertTransition(WorkOrderStatus.AWAITING_REVIEW);
    this._status = WorkOrderStatus.AWAITING_REVIEW;
    this.addEvent(new WorkOrderSubmittedForReview(this._id, by, now));
  }

  returnToInProgress(by: string, reason: string, now: DateTime): void {
    this.assertTransition(WorkOrderStatus.IN_PROGRESS);
    if (this._status !== WorkOrderStatus.AWAITING_REVIEW) {
      throw new InvalidStateTransitionError(this._status, WorkOrderStatus.IN_PROGRESS);
    }
    this._status = WorkOrderStatus.IN_PROGRESS;
    this.addEvent(new WorkOrderReturnedToInProgress(this._id, by, reason, now));
  }

  startClosing(now: DateTime, validator: ClosingValidator): void {
    this.assertStatusIn([WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.AWAITING_REVIEW]);

    const violations = validator.validate(this);
    if (violations.length > 0) {
      throw new WorkOrderClosingValidationError(violations);
    }

    this._status = WorkOrderStatus.CLOSING;
    this.addEvent(new WorkOrderClosingStarted(this._id, now));
  }

  finalizeClose(closedAt: DateTime): void {
    this.assertStatusIn([WorkOrderStatus.CLOSING]);

    this._status = WorkOrderStatus.CLOSED;
    this._closedAt = closedAt;

    const lineData: ClosedConsumptionLineData[] = this._lines.map((l) => ({
      lineId: l.id,
      skuId: l.skuId,
      actualAmount: l.actualAmount.amount,
      actualUnit: l.actualAmount.unit,
      normAmount: l.normAmount.amount,
      normUnit: l.normAmount.unit,
      deviationRatio: l.currentDeviationRatio(),
    }));

    this.addEvent(
      new WorkOrderClosed(
        this._id,
        this._appointmentId,
        this._branchId,
        this._masterId,
        this._clientId,
        this._vehicleId,
        [...this._services],
        lineData,
        this._photosBefore.length,
        this._photosAfter.length,
        closedAt,
      ),
    );
  }

  revertClosing(reason: string, now: DateTime): void {
    this.assertStatusIn([WorkOrderStatus.CLOSING]);
    this._status = WorkOrderStatus.IN_PROGRESS;
    this.addEvent(new WorkOrderClosingReverted(this._id, reason, now));
  }

  reopen(by: string, reason: string, now: DateTime): void {
    this.assertTransition(WorkOrderStatus.IN_PROGRESS);
    if (this._status !== WorkOrderStatus.CLOSED) {
      throw new InvalidStateTransitionError(this._status, WorkOrderStatus.IN_PROGRESS);
    }
    if (!reason.trim()) {
      throw new EmptyReopenReasonError();
    }
    this._status = WorkOrderStatus.IN_PROGRESS;
    this._closedAt = null;
    this.addEvent(new WorkOrderReopened(this._id, by, reason, now));
  }

  cancel(reason: string, by: string, now: DateTime): void {
    this.assertStatusIn([
      WorkOrderStatus.OPEN,
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.AWAITING_REVIEW,
    ]);
    this._status = WorkOrderStatus.CANCELLED;
    this._cancellationReason = reason;
    this.addEvent(new WorkOrderCancelled(this._id, reason, by, now));
  }

  toSnapshot(): WorkOrderSnapshot {
    return {
      id: this._id,
      appointmentId: this._appointmentId,
      branchId: this._branchId,
      masterId: this._masterId,
      clientId: this._clientId,
      vehicleId: this._vehicleId,
      services: [...this._services],
      norms: [...this._normsSnapshot],
      lines: this._lines.map((l) => l.toSnapshot()),
      photosBefore: [...this._photosBefore],
      photosAfter: [...this._photosAfter],
      status: this._status,
      openedAt: this._openedAt.iso(),
      closedAt: this._closedAt ? this._closedAt.iso() : null,
      cancellationReason: this._cancellationReason,
      version: this._version,
    };
  }

  private assertTransition(to: WorkOrderStatus): void {
    if (!canTransition(this._status, to)) {
      throw new InvalidStateTransitionError(this._status, to);
    }
  }

  private assertStatusIn(allowed: readonly WorkOrderStatus[]): void {
    if (!allowed.includes(this._status)) {
      throw new InvalidStateTransitionError(this._status, allowed[0] ?? WorkOrderStatus.OPEN);
    }
  }

  private autoTransitionToInProgress(): void {
    if (this._status === WorkOrderStatus.OPEN) {
      this._status = WorkOrderStatus.IN_PROGRESS;
    }
  }
}
