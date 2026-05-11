import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import { WorkOrder } from './work-order.aggregate';
import {
  ConsumptionLineNotFoundError,
  InvalidStateTransitionError,
  ServicesEmptyError,
  PhotoLimitExceededError,
} from './work-order.errors';
import {
  WorkOrderCancelled,
  WorkOrderConsumptionAdded,
  WorkOrderConsumptionRemoved,
  WorkOrderConsumptionUpdated,
  WorkOrderOpened,
  WorkOrderPhotoAdded,
  WorkOrderPhotoRemoved,
  WorkOrderReturnedToInProgress,
  WorkOrderSubmittedForReview,
} from './work-order.events';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { buildPhotoRef, resetPhotoCounter } from '../testing/photo-ref.builder';
import { WorkOrderBuilder } from '../testing/work-order.builder';
import { PhotoType } from '../value-objects/photo-type';
import { WorkOrderStatus } from '../value-objects/work-order-status';

const NOW = DateTime.from('2024-06-15T10:00:00Z');

describe('WorkOrder aggregate', () => {
  let idGen: FakeIdGenerator;

  beforeEach(() => {
    idGen = new FakeIdGenerator();
    resetPhotoCounter();
  });

  // ─── OPEN FROM APPOINTMENT ────────────────────────────────────────

  describe('openFromAppointment', () => {
    it('should create with OPEN status and lines from norms', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();

      expect(wo.status).toBe(WorkOrderStatus.OPEN);

      const snapshot = wo.toSnapshot();
      expect(snapshot.lines).toHaveLength(2);
      expect(snapshot.lines[0]?.skuId).toBe('00000000-0000-4000-a000-111000000001');
      expect(snapshot.lines[0]?.normAmount).toBe(100);
      expect(snapshot.lines[0]?.actualAmount).toBe(0);
      expect(snapshot.lines[1]?.skuId).toBe('00000000-0000-4000-a000-111000000002');
      expect(snapshot.lines[1]?.normAmount).toBe(2);
    });

    it('should emit WorkOrderOpened event with full snapshot', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      const events = wo.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(WorkOrderOpened);

      const event = events[0] as WorkOrderOpened;
      expect(event.appointmentId).toBe('00000000-0000-4000-a000-aaa000000001');
      expect(event.masterId).toBe('00000000-0000-4000-a000-ccc000000001');
      expect(event.clientId).toBe('00000000-0000-4000-a000-ddd000000001');
      expect(event.vehicleId).toBe('00000000-0000-4000-a000-eee000000001');
      expect(event.branchId).toBe('00000000-0000-4000-a000-bbb000000001');
      expect(event.services).toHaveLength(1);
      expect(event.services[0]?.serviceId).toBe('00000000-0000-4000-a000-fff000000001');
      expect(event.norms).toHaveLength(2);
    });

    it('should reject empty services', () => {
      expect(() => new WorkOrderBuilder().withServices([]).build()).toThrow(ServicesEmptyError);
    });

    it('should accept empty norms (no consumption lines created)', () => {
      const wo = new WorkOrderBuilder().withNorms([]).build();
      expect(wo.toSnapshot().lines).toHaveLength(0);
    });
  });

  // ─── ADD PHOTO BEFORE ──────────────────────────────────────────────

  describe('addPhotoBefore', () => {
    it('should add a photo and auto-transition OPEN → IN_PROGRESS', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.pullDomainEvents();

      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);

      expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);

      const snapshot = wo.toSnapshot();
      expect(snapshot.photosBefore).toHaveLength(1);

      const events = wo.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(WorkOrderPhotoAdded);
      expect((events[0] as WorkOrderPhotoAdded).photoType).toBe(PhotoType.BEFORE);
    });

    it('should not auto-transition if already IN_PROGRESS', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.pullDomainEvents();

      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);

      expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
      expect(wo.toSnapshot().photosBefore).toHaveLength(2);
    });

    it('should allow adding in AWAITING_REVIEW', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.submitForReview('user-1', NOW);
      wo.pullDomainEvents();

      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);

      expect(wo.toSnapshot().photosBefore).toHaveLength(2);
    });

    it('should throw when limit of 20 exceeded', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      for (let i = 0; i < 20; i++) {
        wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      }

      expect(() => {
        wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      }).toThrow(PhotoLimitExceededError);
    });

    it('should throw from CANCELLED', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.cancel('reason', 'user-1', NOW);
      wo.pullDomainEvents();

      expect(() => {
        wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── ADD PHOTO AFTER ───────────────────────────────────────────────

  describe('addPhotoAfter', () => {
    it('should add after photo and auto-transition', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.pullDomainEvents();

      wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);

      expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
      expect(wo.toSnapshot().photosAfter).toHaveLength(1);

      const events = wo.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(WorkOrderPhotoAdded);
      expect((events[0] as WorkOrderPhotoAdded).photoType).toBe(PhotoType.AFTER);
    });

    it('should throw when limit of 20 exceeded', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      for (let i = 0; i < 20; i++) {
        wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);
      }

      expect(() => {
        wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);
      }).toThrow(PhotoLimitExceededError);
    });
  });

  // ─── REMOVE PHOTO ─────────────────────────────────────────────────

  describe('removePhoto', () => {
    it('should remove existing before photo', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      const photo = buildPhotoRef({ type: PhotoType.BEFORE });
      wo.addPhotoBefore(photo, NOW);
      wo.pullDomainEvents();

      wo.removePhoto(photo.id, NOW);

      expect(wo.toSnapshot().photosBefore).toHaveLength(0);
      const events = wo.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(WorkOrderPhotoRemoved);
    });

    it('should remove existing after photo', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      const photo = buildPhotoRef({ type: PhotoType.AFTER });
      wo.addPhotoAfter(photo, NOW);
      wo.pullDomainEvents();

      wo.removePhoto(photo.id, NOW);

      expect(wo.toSnapshot().photosAfter).toHaveLength(0);
    });

    it('should throw if photo not found', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();

      expect(() => {
        wo.removePhoto('nonexistent', NOW);
      }).toThrow();
    });
  });

  // ─── ADD CONSUMPTION ──────────────────────────────────────────────

  describe('addConsumption', () => {
    it('should update existing line if skuId matches', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.pullDomainEvents();

      const amount = Quantity.of(80, UnitOfMeasure.ML);
      wo.addConsumption('00000000-0000-4000-a000-111000000001', amount, NOW, idGen);

      const snapshot = wo.toSnapshot();
      const line = snapshot.lines.find((l) => l.skuId === '00000000-0000-4000-a000-111000000001');
      expect(line?.actualAmount).toBe(80);

      const events = wo.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(WorkOrderConsumptionUpdated);
    });

    it('should create new line for unknown skuId (out-of-norms, normAmount=0)', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.pullDomainEvents();

      const amount = Quantity.of(50, UnitOfMeasure.ML);
      wo.addConsumption('new-sku-id', amount, NOW, idGen);

      const snapshot = wo.toSnapshot();
      expect(snapshot.lines).toHaveLength(3);
      const newLine = snapshot.lines.find((l) => l.skuId === 'new-sku-id');
      expect(newLine?.actualAmount).toBe(50);
      expect(newLine?.normAmount).toBe(0);

      const events = wo.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(WorkOrderConsumptionAdded);
    });

    it('should auto-transition OPEN → IN_PROGRESS', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.pullDomainEvents();

      wo.addConsumption('new-sku', Quantity.of(10, UnitOfMeasure.ML), NOW, idGen);

      expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
    });

    it('should throw from AWAITING_REVIEW', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.submitForReview('user-1', NOW);
      wo.pullDomainEvents();

      expect(() => {
        wo.addConsumption('new-sku', Quantity.of(10, UnitOfMeasure.ML), NOW, idGen);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should throw from CANCELLED', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.cancel('reason', 'user-1', NOW);
      wo.pullDomainEvents();

      expect(() => {
        wo.addConsumption('new-sku', Quantity.of(10, UnitOfMeasure.ML), NOW, idGen);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── UPDATE CONSUMPTION ───────────────────────────────────────────

  describe('updateConsumption', () => {
    it('should update line by id', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      const snapshot = wo.toSnapshot();
      const lineId = snapshot.lines[0]?.id ?? '';
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.pullDomainEvents();

      wo.updateConsumption(lineId, Quantity.of(90, UnitOfMeasure.ML), NOW, 'reason');

      const updated = wo.toSnapshot();
      const line = updated.lines.find((l) => l.id === lineId);
      expect(line?.actualAmount).toBe(90);
      expect(line?.deviationReason).toBe('reason');

      const events = wo.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(WorkOrderConsumptionUpdated);
    });

    it('should throw for unknown lineId', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);

      expect(() => {
        wo.updateConsumption('nonexistent', Quantity.of(10, UnitOfMeasure.ML), NOW);
      }).toThrow(ConsumptionLineNotFoundError);
    });

    it('should allow update in AWAITING_REVIEW', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      const lineId = wo.toSnapshot().lines[0]?.id ?? '';
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.submitForReview('user-1', NOW);
      wo.pullDomainEvents();

      expect(() => {
        wo.updateConsumption(lineId, Quantity.of(100, UnitOfMeasure.ML), NOW);
      }).not.toThrow();
    });
  });

  // ─── REMOVE CONSUMPTION ──────────────────────────────────────────

  describe('removeConsumption', () => {
    it('should remove line by id', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      const lineId = wo.toSnapshot().lines[0]?.id ?? '';
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.pullDomainEvents();

      wo.removeConsumption(lineId, NOW);

      expect(wo.toSnapshot().lines).toHaveLength(1);
      const events = wo.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(WorkOrderConsumptionRemoved);
    });

    it('should throw for unknown lineId', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);

      expect(() => {
        wo.removeConsumption('nonexistent', NOW);
      }).toThrow(ConsumptionLineNotFoundError);
    });
  });

  // ─── SUBMIT FOR REVIEW ───────────────────────────────────────────

  describe('submitForReview', () => {
    it('IN_PROGRESS → AWAITING_REVIEW', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.pullDomainEvents();

      wo.submitForReview('user-1', NOW);

      expect(wo.status).toBe(WorkOrderStatus.AWAITING_REVIEW);
      const events = wo.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(WorkOrderSubmittedForReview);
    });

    it('should throw from OPEN (not in IN_PROGRESS)', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();

      expect(() => {
        wo.submitForReview('user-1', NOW);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should throw if already AWAITING_REVIEW', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.submitForReview('user-1', NOW);

      expect(() => {
        wo.submitForReview('user-1', NOW);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── RETURN TO IN_PROGRESS ────────────────────────────────────────

  describe('returnToInProgress', () => {
    it('AWAITING_REVIEW → IN_PROGRESS', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.submitForReview('user-1', NOW);
      wo.pullDomainEvents();

      wo.returnToInProgress('manager-1', 'needs more work', NOW);

      expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
      const events = wo.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(WorkOrderReturnedToInProgress);
      expect((events[0] as WorkOrderReturnedToInProgress).reason).toBe('needs more work');
    });

    it('should throw from IN_PROGRESS', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);

      expect(() => {
        wo.returnToInProgress('manager-1', 'reason', NOW);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── CANCEL ───────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should cancel from OPEN', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.pullDomainEvents();

      wo.cancel('client left', 'user-1', NOW);

      expect(wo.status).toBe(WorkOrderStatus.CANCELLED);
      const snapshot = wo.toSnapshot();
      expect(snapshot.cancellationReason).toBe('client left');

      const events = wo.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(WorkOrderCancelled);
      expect((events[0] as WorkOrderCancelled).reason).toBe('client left');
    });

    it('should cancel from IN_PROGRESS', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.pullDomainEvents();

      wo.cancel('emergency', 'user-1', NOW);

      expect(wo.status).toBe(WorkOrderStatus.CANCELLED);
    });

    it('should cancel from AWAITING_REVIEW', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.submitForReview('user-1', NOW);
      wo.pullDomainEvents();

      wo.cancel('mistake', 'manager-1', NOW);

      expect(wo.status).toBe(WorkOrderStatus.CANCELLED);
    });

    it('should throw from CANCELLED (terminal)', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.cancel('reason', 'user-1', NOW);

      expect(() => {
        wo.cancel('again', 'user-1', NOW);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── STATE MACHINE GUARDS ─────────────────────────────────────────

  describe('state machine guards', () => {
    it('should not allow submitForReview from CANCELLED', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.cancel('reason', 'user-1', NOW);

      expect(() => {
        wo.submitForReview('user-1', NOW);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should not allow addConsumption from CLOSED status', () => {
      const snapshot = new WorkOrderBuilder().withIdGen(idGen).build().toSnapshot();
      const closed = WorkOrder.restore({ ...snapshot, status: WorkOrderStatus.CLOSED });

      expect(() => {
        closed.addConsumption('sku', Quantity.of(10, UnitOfMeasure.ML), NOW, idGen);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should not allow removeConsumption from CLOSED', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      const lineId = wo.toSnapshot().lines[0]?.id ?? '';
      const snapshot = wo.toSnapshot();
      const closed = WorkOrder.restore({ ...snapshot, status: WorkOrderStatus.CLOSED });

      expect(() => {
        closed.removeConsumption(lineId, NOW);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should not allow addPhotoBefore from CLOSED', () => {
      const snapshot = new WorkOrderBuilder().withIdGen(idGen).build().toSnapshot();
      const closed = WorkOrder.restore({ ...snapshot, status: WorkOrderStatus.CLOSED });

      expect(() => {
        closed.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      }).toThrow(InvalidStateTransitionError);
    });

    it('should not allow removePhoto from CLOSED', () => {
      const snapshot = new WorkOrderBuilder().withIdGen(idGen).build().toSnapshot();
      const closed = WorkOrder.restore({ ...snapshot, status: WorkOrderStatus.CLOSED });

      expect(() => {
        closed.removePhoto('any-id', NOW);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  // ─── RESTORE ──────────────────────────────────────────────────────

  describe('restore', () => {
    it('should restore from snapshot without events', () => {
      const original = new WorkOrderBuilder().withIdGen(idGen).build();
      const snapshot = original.toSnapshot();

      const restored = WorkOrder.restore(snapshot);

      expect(restored.id).toBe(original.id);
      expect(restored.status).toBe(original.status);
      expect(restored.appointmentId).toBe(original.appointmentId);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });

    it('should preserve lines through restore', () => {
      const wo = new WorkOrderBuilder().withIdGen(idGen).build();
      wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
      wo.addConsumption(
        '00000000-0000-4000-a000-111000000001',
        Quantity.of(80, UnitOfMeasure.ML),
        NOW,
        idGen,
      );
      const snapshot = wo.toSnapshot();

      const restored = WorkOrder.restore(snapshot);
      const restoredSnapshot = restored.toSnapshot();

      expect(restoredSnapshot.lines).toHaveLength(2);
      const line = restoredSnapshot.lines.find(
        (l) => l.skuId === '00000000-0000-4000-a000-111000000001',
      );
      expect(line?.actualAmount).toBe(80);
    });
  });
});
