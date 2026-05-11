import { DateTime } from '@det/backend-shared-ddd';

import { Appointment } from './appointment.aggregate';
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
import { AppointmentBuilder } from '../testing/appointment.builder';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { AppointmentStatus } from '../value-objects/appointment-status';
import { CreationChannel } from '../value-objects/creation-channel';
import { TimeSlot } from '../value-objects/time-slot.value-object';
import { Timezone } from '../value-objects/timezone.value-object';

const LATER = DateTime.from('2024-02-15T10:00:00Z');
const TZ = Timezone.from('Europe/Moscow');

describe('Appointment aggregate', () => {
  // ─── CREATE ───────────────────────────────────────────────────────

  describe('create', () => {
    it('ONLINE → CONFIRMED', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.ONLINE).build();

      expect(appt.status).toBe(AppointmentStatus.CONFIRMED);

      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentCreated);
      expect((events[0] as AppointmentCreated).status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('MANAGER → CONFIRMED', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.MANAGER).build();

      expect(appt.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('GUEST → PENDING_CONFIRMATION', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.GUEST).build();

      expect(appt.status).toBe(AppointmentStatus.PENDING_CONFIRMATION);
    });

    it('should reject empty services', () => {
      expect(() => new AppointmentBuilder().withServices([]).build()).toThrow(ServicesEmptyError);
    });

    it('should reject slot shorter than total services duration', () => {
      const shortSlot = TimeSlot.from(
        DateTime.from('2024-02-15T09:00:00Z'),
        DateTime.from('2024-02-15T09:30:00Z'),
        TZ,
      );
      expect(() => new AppointmentBuilder().withSlot(shortSlot).build()).toThrow(
        SlotDurationTooShortError,
      );
    });

    it('should accept slot equal to services duration', () => {
      const exactSlot = TimeSlot.from(
        DateTime.from('2024-02-15T09:00:00Z'),
        DateTime.from('2024-02-15T10:00:00Z'),
        TZ,
      );
      expect(() => new AppointmentBuilder().withSlot(exactSlot).build()).not.toThrow();
    });

    it('AppointmentCreated event should contain full snapshot', () => {
      const appt = new AppointmentBuilder().build();
      const event = appt.pullDomainEvents()[0] as AppointmentCreated;

      expect(event.clientId).toBe('00000000-0000-4000-a000-000000000020');
      expect(event.masterId).toBe('00000000-0000-4000-a000-000000000010');
      expect(event.branchId).toBe('00000000-0000-4000-a000-000000000099');
      expect(event.services).toHaveLength(1);
      expect(event.services[0]?.serviceId).toBe('00000000-0000-4000-a000-000000000060');
      expect(event.slotStart).toBeDefined();
      expect(event.slotEnd).toBeDefined();
    });
  });

  // ─── CONFIRM ──────────────────────────────────────────────────────

  describe('confirm', () => {
    it('PENDING_CONFIRMATION → CONFIRMED', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.GUEST).build();
      appt.pullDomainEvents();

      appt.confirm('user-1', LATER);

      expect(appt.status).toBe(AppointmentStatus.CONFIRMED);
      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentConfirmed);
    });

    it('should throw from CONFIRMED (already confirmed)', () => {
      const appt = new AppointmentBuilder().build();
      expect(() => {
        appt.confirm('user-1', LATER);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── RESCHEDULE ───────────────────────────────────────────────────

  describe('reschedule', () => {
    it('should reschedule from CONFIRMED', () => {
      const appt = new AppointmentBuilder().build();
      appt.pullDomainEvents();

      const newSlot = TimeSlot.from(
        DateTime.from('2024-02-16T09:00:00Z'),
        DateTime.from('2024-02-16T10:30:00Z'),
        TZ,
      );

      appt.reschedule(newSlot, 'user-1', LATER);

      expect(appt.slot.equals(newSlot)).toBe(true);
      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentRescheduled);

      const event = events[0] as AppointmentRescheduled;
      expect(event.oldSlotStart).toBeDefined();
      expect(event.newSlotStart).toBe(newSlot.start.iso());
    });

    it('should reschedule from PENDING_CONFIRMATION', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.GUEST).build();
      appt.pullDomainEvents();

      const newSlot = TimeSlot.from(
        DateTime.from('2024-02-16T09:00:00Z'),
        DateTime.from('2024-02-16T10:30:00Z'),
        TZ,
      );

      expect(() => {
        appt.reschedule(newSlot, 'user-1', LATER);
      }).not.toThrow();
    });

    it('should throw from IN_PROGRESS', () => {
      const appt = new AppointmentBuilder().build();
      appt.startWork('user-1', LATER);
      appt.pullDomainEvents();

      const newSlot = TimeSlot.from(
        DateTime.from('2024-02-16T09:00:00Z'),
        DateTime.from('2024-02-16T10:30:00Z'),
        TZ,
      );

      expect(() => {
        appt.reschedule(newSlot, 'user-1', LATER);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should reject too-short slot on reschedule', () => {
      const appt = new AppointmentBuilder().build();
      const shortSlot = TimeSlot.from(
        DateTime.from('2024-02-16T09:00:00Z'),
        DateTime.from('2024-02-16T09:30:00Z'),
        TZ,
      );

      expect(() => {
        appt.reschedule(shortSlot, 'user-1', LATER);
      }).toThrow(SlotDurationTooShortError);
    });

    it('should update masterId and bayId when provided', () => {
      const appt = new AppointmentBuilder().build();
      appt.pullDomainEvents();

      const newSlot = TimeSlot.from(
        DateTime.from('2024-02-16T09:00:00Z'),
        DateTime.from('2024-02-16T10:30:00Z'),
        TZ,
      );
      const newMaster = '00000000-0000-4000-a000-000000000011';
      const newBay = '00000000-0000-4000-a000-000000000077';

      appt.reschedule(newSlot, 'user-1', LATER, newMaster, newBay);

      expect(appt.masterId).toBe(newMaster);
      const event = appt.pullDomainEvents()[0] as AppointmentRescheduled;
      expect(event.newMasterId).toBe(newMaster);
      expect(event.newBayId).toBe(newBay);
    });
  });

  // ─── CANCEL ───────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should cancel from CONFIRMED', () => {
      const appt = new AppointmentBuilder().build();
      appt.pullDomainEvents();

      appt.cancel('user-1', 'Client requested', LATER);

      expect(appt.status).toBe(AppointmentStatus.CANCELLED);
      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentCancelled);
    });

    it('should cancel from PENDING_CONFIRMATION', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.GUEST).build();
      appt.pullDomainEvents();

      expect(() => {
        appt.cancel('user-1', 'Changed mind', LATER);
      }).not.toThrow();
      expect(appt.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('should throw from IN_PROGRESS', () => {
      const appt = new AppointmentBuilder().build();
      appt.startWork('user-1', LATER);

      expect(() => {
        appt.cancel('user-1', 'reason', LATER);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should throw from COMPLETED', () => {
      const appt = new AppointmentBuilder().build();
      appt.startWork('user-1', LATER);
      appt.complete(LATER);

      expect(() => {
        appt.cancel('user-1', 'reason', LATER);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── CANCELLATION REQUEST FLOW ────────────────────────────────────

  describe('requestCancellation', () => {
    it('should create a pending cancellation request', () => {
      const appt = new AppointmentBuilder().build();
      appt.pullDomainEvents();

      const idGen = new FakeIdGenerator('00000000-0000-4000-a000-cccccccccccc');
      appt.requestCancellation('client-1', 'Too expensive', LATER, idGen);

      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentCancellationRequested);

      const snapshot = appt.toSnapshot();
      expect(snapshot.cancellationRequest).not.toBeNull();
      expect(snapshot.cancellationRequest?.status).toBe(CancellationRequestStatus.PENDING);
    });

    it('should throw from non-CONFIRMED status', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.GUEST).build();
      const idGen = new FakeIdGenerator();

      expect(() => {
        appt.requestCancellation('client-1', 'reason', LATER, idGen);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  describe('approveCancellation', () => {
    it('should approve and cancel the appointment', () => {
      const appt = new AppointmentBuilder().build();
      const idGen = new FakeIdGenerator('00000000-0000-4000-a000-cccccccccccc');
      appt.requestCancellation('client-1', 'reason', LATER, idGen);
      appt.pullDomainEvents();

      appt.approveCancellation('manager-1', LATER);

      expect(appt.status).toBe(AppointmentStatus.CANCELLED);
      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(AppointmentCancellationApproved);
      expect(events[1]).toBeInstanceOf(AppointmentCancelled);
    });

    it('should throw when no cancellation request', () => {
      const appt = new AppointmentBuilder().build();
      expect(() => {
        appt.approveCancellation('manager-1', LATER);
      }).toThrow(NoCancellationRequestError);
    });

    it('should throw when already decided', () => {
      const appt = new AppointmentBuilder().build();
      const idGen = new FakeIdGenerator('00000000-0000-4000-a000-cccccccccccc');
      appt.requestCancellation('client-1', 'reason', LATER, idGen);
      appt.rejectCancellation('manager-1', 'No reason to cancel', LATER);

      expect(() => {
        appt.approveCancellation('manager-1', LATER);
      }).toThrow(CancellationRequestAlreadyDecidedError);
    });
  });

  describe('rejectCancellation', () => {
    it('should reject and keep CONFIRMED status', () => {
      const appt = new AppointmentBuilder().build();
      const idGen = new FakeIdGenerator('00000000-0000-4000-a000-cccccccccccc');
      appt.requestCancellation('client-1', 'reason', LATER, idGen);
      appt.pullDomainEvents();

      appt.rejectCancellation('manager-1', 'Service already prepared', LATER);

      expect(appt.status).toBe(AppointmentStatus.CONFIRMED);
      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentCancellationRejected);

      const snapshot = appt.toSnapshot();
      expect(snapshot.cancellationRequest?.status).toBe(CancellationRequestStatus.REJECTED);
      expect(snapshot.cancellationRequest?.decisionReason).toBe('Service already prepared');
    });
  });

  // ─── START WORK ───────────────────────────────────────────────────

  describe('startWork', () => {
    it('CONFIRMED → IN_PROGRESS with full snapshot event', () => {
      const appt = new AppointmentBuilder().build();
      appt.pullDomainEvents();

      appt.startWork('user-1', LATER);

      expect(appt.status).toBe(AppointmentStatus.IN_PROGRESS);
      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentStarted);

      const event = events[0] as AppointmentStarted;
      expect(event.masterId).toBe('00000000-0000-4000-a000-000000000010');
      expect(event.branchId).toBe('00000000-0000-4000-a000-000000000099');
      expect(event.clientId).toBe('00000000-0000-4000-a000-000000000020');
      expect(event.vehicleId).toBe('00000000-0000-4000-a000-000000000030');
      expect(event.slotStart).toBeDefined();
      expect(event.slotEnd).toBeDefined();
      expect(event.services).toHaveLength(1);
      expect(event.services[0]?.serviceId).toBe('00000000-0000-4000-a000-000000000060');
      expect(event.services[0]?.durationMinutes).toBe(60);
      expect(event.services[0]?.priceCents).toBe(500000n);
    });

    it('should throw from PENDING_CONFIRMATION', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.GUEST).build();

      expect(() => {
        appt.startWork('user-1', LATER);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── COMPLETE ─────────────────────────────────────────────────────

  describe('complete', () => {
    it('IN_PROGRESS → COMPLETED', () => {
      const appt = new AppointmentBuilder().build();
      appt.startWork('user-1', LATER);
      appt.pullDomainEvents();

      appt.complete(LATER);

      expect(appt.status).toBe(AppointmentStatus.COMPLETED);
      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentCompleted);
    });

    it('should throw from CONFIRMED', () => {
      const appt = new AppointmentBuilder().build();
      expect(() => {
        appt.complete(LATER);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── MARK NO SHOW ────────────────────────────────────────────────

  describe('markNoShow', () => {
    it('CONFIRMED → NO_SHOW', () => {
      const appt = new AppointmentBuilder().build();
      appt.pullDomainEvents();

      appt.markNoShow('user-1', LATER);

      expect(appt.status).toBe(AppointmentStatus.NO_SHOW);
      const events = appt.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AppointmentMarkedNoShow);
    });

    it('should throw from PENDING_CONFIRMATION', () => {
      const appt = new AppointmentBuilder().withCreatedVia(CreationChannel.GUEST).build();

      expect(() => {
        appt.markNoShow('user-1', LATER);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── RESTORE ──────────────────────────────────────────────────────

  describe('restore', () => {
    it('should restore from snapshot without events', () => {
      const original = new AppointmentBuilder().build();
      const snapshot = original.toSnapshot();

      const restored = Appointment.restore(snapshot);

      expect(restored.id).toBe(original.id);
      expect(restored.status).toBe(original.status);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });

  // ─── TERMINAL STATE GUARDS ────────────────────────────────────────

  describe('terminal state guards', () => {
    it('should not allow cancel from CANCELLED', () => {
      const appt = new AppointmentBuilder().build();
      appt.cancel('user-1', 'reason', LATER);

      expect(() => {
        appt.cancel('user-1', 'again', LATER);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should not allow startWork from NO_SHOW', () => {
      const appt = new AppointmentBuilder().build();
      appt.markNoShow('user-1', LATER);

      expect(() => {
        appt.startWork('user-1', LATER);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should not allow reschedule from COMPLETED', () => {
      const appt = new AppointmentBuilder().build();
      appt.startWork('user-1', LATER);
      appt.complete(LATER);

      const newSlot = TimeSlot.from(
        DateTime.from('2024-02-16T09:00:00Z'),
        DateTime.from('2024-02-16T10:30:00Z'),
        TZ,
      );

      expect(() => {
        appt.reschedule(newSlot, 'user-1', LATER);
      }).toThrow(InvalidStateTransitionError);
    });
  });
});
