import { AggregateRoot, DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';

import {
  CancellationRequestAlreadyDecidedError,
  InvalidStateTransitionError,
  NoCancellationRequestError,
  ServicesEmptyError,
  SlotDurationTooShortError,
} from './appointment.errors';
import {
  AppointmentCancellationApproved,
  AppointmentCancellationRejected,
  AppointmentCancellationRequested,
  AppointmentCancelled,
  AppointmentCompleted,
  AppointmentConfirmed,
  AppointmentCreated,
  AppointmentMarkedNoShow,
  AppointmentRescheduled,
  AppointmentStarted,
} from './appointment.events';
import { CancellationRequestStatus } from './cancellation-request';
import { canTransition } from './state-transitions';
import { AppointmentId } from '../value-objects/appointment-id';
import { AppointmentStatus } from '../value-objects/appointment-status';
import { CancellationRequestId } from '../value-objects/cancellation-request-id';
import { CreationChannel } from '../value-objects/creation-channel';
import { TimeSlot } from '../value-objects/time-slot.value-object';
import { Timezone } from '../value-objects/timezone.value-object';

import type { AppointmentServiceSnapshot } from './appointment.events';
import type { CancellationRequest } from './cancellation-request';
import type { AppointmentService } from '../value-objects/appointment-service.value-object';

export interface CreateAppointmentProps {
  readonly clientId: string;
  readonly vehicleId: string;
  readonly branchId: string;
  readonly bayId?: string | null;
  readonly masterId: string;
  readonly services: readonly AppointmentService[];
  readonly slot: TimeSlot;
  readonly createdBy: string;
  readonly createdVia: CreationChannel;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface AppointmentSnapshot {
  readonly id: string;
  readonly clientId: string;
  readonly vehicleId: string;
  readonly branchId: string;
  readonly bayId: string | null;
  readonly masterId: string;
  readonly services: readonly AppointmentService[];
  readonly slotStart: string;
  readonly slotEnd: string;
  readonly timezone: string;
  readonly status: AppointmentStatus;
  readonly cancellationRequest: CancellationRequest | null;
  readonly createdBy: string;
  readonly createdVia: CreationChannel;
  readonly createdAt: string;
  readonly version: number;
}

export class Appointment extends AggregateRoot<AppointmentId> {
  private constructor(
    private readonly _id: AppointmentId,
    private readonly _clientId: string,
    private readonly _vehicleId: string,
    private readonly _branchId: string,
    private _bayId: string | null,
    private _masterId: string,
    private readonly _services: readonly AppointmentService[],
    private _slot: TimeSlot,
    private _status: AppointmentStatus,
    private _cancellationRequest: CancellationRequest | null,
    private readonly _createdBy: string,
    private readonly _createdVia: CreationChannel,
    private readonly _createdAt: DateTime,
    private readonly _version: number,
  ) {
    super();
  }

  override get id(): AppointmentId {
    return this._id;
  }

  get status(): AppointmentStatus {
    return this._status;
  }

  get slot(): TimeSlot {
    return this._slot;
  }

  get masterId(): string {
    return this._masterId;
  }

  static create(props: CreateAppointmentProps): Appointment {
    if (props.services.length === 0) {
      throw new ServicesEmptyError();
    }

    Appointment.validateSlotDuration(props.slot, props.services);

    const initialStatus =
      props.createdVia === CreationChannel.GUEST
        ? AppointmentStatus.PENDING_CONFIRMATION
        : AppointmentStatus.CONFIRMED;

    const appt = new Appointment(
      AppointmentId.generate(props.idGen),
      props.clientId,
      props.vehicleId,
      props.branchId,
      props.bayId ?? null,
      props.masterId,
      [...props.services],
      props.slot,
      initialStatus,
      null,
      props.createdBy,
      props.createdVia,
      props.now,
      0,
    );

    const serviceSnapshots: AppointmentServiceSnapshot[] = props.services.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      serviceName: s.serviceNameSnapshot,
      durationMinutes: s.durationMinutesSnapshot,
      priceCents: s.priceSnapshot.cents,
    }));

    appt.addEvent(
      new AppointmentCreated(
        appt.id,
        props.clientId,
        props.vehicleId,
        props.branchId,
        props.bayId ?? null,
        props.masterId,
        serviceSnapshots,
        props.slot.start.iso(),
        props.slot.end.iso(),
        props.slot.timezone.getValue(),
        initialStatus,
        props.createdVia,
        props.createdBy,
        props.now,
      ),
    );

    return appt;
  }

  static restore(snapshot: AppointmentSnapshot): Appointment {
    return new Appointment(
      AppointmentId.from(snapshot.id),
      snapshot.clientId,
      snapshot.vehicleId,
      snapshot.branchId,
      snapshot.bayId,
      snapshot.masterId,
      [...snapshot.services],
      TimeSlot.from(
        DateTime.from(snapshot.slotStart),
        DateTime.from(snapshot.slotEnd),
        Timezone.from(snapshot.timezone),
      ),
      snapshot.status,
      snapshot.cancellationRequest,
      snapshot.createdBy,
      snapshot.createdVia,
      DateTime.from(snapshot.createdAt),
      snapshot.version,
    );
  }

  confirm(by: string, now: DateTime): void {
    this.assertTransition(AppointmentStatus.CONFIRMED);
    this._status = AppointmentStatus.CONFIRMED;
    this.addEvent(new AppointmentConfirmed(this.id, by, now));
  }

  reschedule(
    newSlot: TimeSlot,
    by: string,
    now: DateTime,
    newMasterId?: string,
    newBayId?: string | null,
  ): void {
    this.assertTransitionAllowed([
      AppointmentStatus.PENDING_CONFIRMATION,
      AppointmentStatus.CONFIRMED,
    ]);

    Appointment.validateSlotDuration(newSlot, this._services);

    const oldSlot = this._slot;
    const oldMasterId = this._masterId;
    const oldBayId = this._bayId;

    this._slot = newSlot;
    if (newMasterId !== undefined) {
      this._masterId = newMasterId;
    }
    if (newBayId !== undefined) {
      this._bayId = newBayId ?? null;
    }

    this.addEvent(
      new AppointmentRescheduled(
        this.id,
        oldSlot.start.iso(),
        oldSlot.end.iso(),
        newSlot.start.iso(),
        newSlot.end.iso(),
        oldMasterId,
        this._masterId,
        oldBayId,
        this._bayId,
        by,
        now,
      ),
    );
  }

  cancel(by: string, reason: string, now: DateTime): void {
    this.assertTransitionAllowed([
      AppointmentStatus.PENDING_CONFIRMATION,
      AppointmentStatus.CONFIRMED,
    ]);
    this._status = AppointmentStatus.CANCELLED;
    this.addEvent(new AppointmentCancelled(this.id, reason, by, now));
  }

  requestCancellation(
    requestedBy: string,
    reason: string,
    now: DateTime,
    idGen: IIdGenerator,
  ): void {
    this.assertTransitionAllowed([AppointmentStatus.CONFIRMED]);

    this._cancellationRequest = {
      id: CancellationRequestId.generate(idGen),
      requestedAt: now,
      requestedBy,
      reason,
      status: CancellationRequestStatus.PENDING,
      decidedAt: null,
      decidedBy: null,
      decisionReason: null,
    };

    this.addEvent(new AppointmentCancellationRequested(this.id, requestedBy, reason, now));
  }

  approveCancellation(by: string, now: DateTime): void {
    this.assertPendingCancellationRequest();

    const req = this._cancellationRequest as CancellationRequest;
    this._cancellationRequest = {
      ...req,
      status: CancellationRequestStatus.APPROVED,
      decidedAt: now,
      decidedBy: by,
    };
    this._status = AppointmentStatus.CANCELLED;

    this.addEvent(new AppointmentCancellationApproved(this.id, by, now));
    this.addEvent(new AppointmentCancelled(this.id, req.reason, by, now));
  }

  rejectCancellation(by: string, reason: string, now: DateTime): void {
    this.assertPendingCancellationRequest();

    const req = this._cancellationRequest as CancellationRequest;
    this._cancellationRequest = {
      ...req,
      status: CancellationRequestStatus.REJECTED,
      decidedAt: now,
      decidedBy: by,
      decisionReason: reason,
    };

    this.addEvent(new AppointmentCancellationRejected(this.id, by, reason, now));
  }

  startWork(by: string, now: DateTime): void {
    this.assertTransition(AppointmentStatus.IN_PROGRESS);
    this._status = AppointmentStatus.IN_PROGRESS;

    const serviceSnapshots: AppointmentServiceSnapshot[] = this._services.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      serviceName: s.serviceNameSnapshot,
      durationMinutes: s.durationMinutesSnapshot,
      priceCents: s.priceSnapshot.cents,
    }));

    this.addEvent(
      new AppointmentStarted(
        this.id,
        this._masterId,
        this._branchId,
        this._clientId,
        this._vehicleId,
        this._slot.start.iso(),
        this._slot.end.iso(),
        serviceSnapshots,
        by,
        now,
      ),
    );
  }

  complete(now: DateTime): void {
    this.assertTransition(AppointmentStatus.COMPLETED);
    this._status = AppointmentStatus.COMPLETED;
    this.addEvent(new AppointmentCompleted(this.id, now));
  }

  markNoShow(by: string, now: DateTime): void {
    this.assertTransition(AppointmentStatus.NO_SHOW);
    this._status = AppointmentStatus.NO_SHOW;
    this.addEvent(new AppointmentMarkedNoShow(this.id, by, now));
  }

  toSnapshot(): AppointmentSnapshot {
    return {
      id: this.id,
      clientId: this._clientId,
      vehicleId: this._vehicleId,
      branchId: this._branchId,
      bayId: this._bayId,
      masterId: this._masterId,
      services: [...this._services],
      slotStart: this._slot.start.iso(),
      slotEnd: this._slot.end.iso(),
      timezone: this._slot.timezone.getValue(),
      status: this._status,
      cancellationRequest: this._cancellationRequest ? { ...this._cancellationRequest } : null,
      createdBy: this._createdBy,
      createdVia: this._createdVia,
      createdAt: this._createdAt.iso(),
      version: this._version,
    };
  }

  private assertTransition(to: AppointmentStatus): void {
    if (!canTransition(this._status, to)) {
      throw new InvalidStateTransitionError(this._status, to);
    }
  }

  private assertTransitionAllowed(allowed: readonly AppointmentStatus[]): void {
    if (!allowed.includes(this._status)) {
      throw new InvalidStateTransitionError(this._status, AppointmentStatus.CANCELLED);
    }
  }

  private assertPendingCancellationRequest(): void {
    if (this._cancellationRequest == null) {
      throw new NoCancellationRequestError();
    }
    if (this._cancellationRequest.status !== CancellationRequestStatus.PENDING) {
      throw new CancellationRequestAlreadyDecidedError();
    }
  }

  private static validateSlotDuration(
    slot: TimeSlot,
    services: readonly AppointmentService[],
  ): void {
    const totalServiceMinutes = services.reduce((sum, s) => sum + s.durationMinutesSnapshot, 0);
    const slotMinutes = slot.durationMinutes();
    if (slotMinutes < totalServiceMinutes) {
      throw new SlotDurationTooShortError(slotMinutes, totalServiceMinutes);
    }
  }
}
