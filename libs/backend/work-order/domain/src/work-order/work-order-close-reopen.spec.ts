import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import { WorkOrder } from './work-order.aggregate';
import {
  EmptyReopenReasonError,
  InvalidStateTransitionError,
  WorkOrderClosingValidationError,
} from './work-order.errors';
import { WorkOrderClosed, WorkOrderReopened } from './work-order.events';
import { ClosingValidator } from '../services/closing-validator';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { buildPhotoRef, resetPhotoCounter } from '../testing/photo-ref.builder';
import { WorkOrderBuilder } from '../testing/work-order.builder';
import { PhotoType } from '../value-objects/photo-type';
import { WorkOrderStatus } from '../value-objects/work-order-status';

const NOW = DateTime.from('2024-06-15T10:00:00Z');
const CLOSE_AT = DateTime.from('2024-06-15T12:00:00Z');
const REOPEN_AT = DateTime.from('2024-06-15T13:00:00Z');

describe('WorkOrder.close', () => {
  const validator = new ClosingValidator();
  let idGen: FakeIdGenerator;

  beforeEach(() => {
    idGen = new FakeIdGenerator();
    resetPhotoCounter();
  });

  function buildClosableWo(): WorkOrder {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
    wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000001',
      Quantity.of(100, UnitOfMeasure.ML),
      NOW,
      idGen,
    );
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000002',
      Quantity.of(2, UnitOfMeasure.PCS),
      NOW,
      idGen,
    );
    wo.pullDomainEvents();
    return wo;
  }

  it('should close from IN_PROGRESS with valid state', () => {
    const wo = buildClosableWo();

    wo.close(CLOSE_AT, validator);

    expect(wo.status).toBe(WorkOrderStatus.CLOSED);
    const snapshot = wo.toSnapshot();
    expect(snapshot.closedAt).toBe(CLOSE_AT.iso());
  });

  it('should close from AWAITING_REVIEW', () => {
    const wo = buildClosableWo();
    wo.submitForReview('user-1', NOW);
    wo.pullDomainEvents();

    wo.close(CLOSE_AT, validator);

    expect(wo.status).toBe(WorkOrderStatus.CLOSED);
  });

  it('should emit WorkOrderClosed with full snapshot', () => {
    const wo = buildClosableWo();

    wo.close(CLOSE_AT, validator);

    const events = wo.pullDomainEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as WorkOrderClosed;
    expect(event).toBeInstanceOf(WorkOrderClosed);
    expect(event.workOrderId).toBe(wo.id);
    expect(event.appointmentId).toBeTruthy();
    expect(event.branchId).toBeTruthy();
    expect(event.masterId).toBeTruthy();
    expect(event.clientId).toBeTruthy();
    expect(event.vehicleId).toBeTruthy();
    expect(event.services).toHaveLength(1);
    expect(event.lines).toHaveLength(2);
    expect(event.photosBeforeCount).toBe(1);
    expect(event.photosAfterCount).toBe(1);
    expect(event.closedAt).toBe(CLOSE_AT);

    const line = event.lines[0];
    expect(line).toBeDefined();
    if (line) {
      expect(line.lineId).toBeTruthy();
      expect(line.skuId).toBeTruthy();
      expect(typeof line.actualAmount).toBe('number');
      expect(typeof line.normAmount).toBe('number');
      expect(typeof line.deviationRatio).toBe('number');
    }
  });

  it('should throw InvalidStateTransitionError when closing from OPEN', () => {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
    wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);
    wo.pullDomainEvents();

    const openSnapshot = wo.toSnapshot();
    const openWo = WorkOrder.restore({ ...openSnapshot, status: WorkOrderStatus.OPEN });

    expect(() => {
      openWo.close(CLOSE_AT, validator);
    }).toThrow(InvalidStateTransitionError);
  });

  it('should throw InvalidStateTransitionError when closing from CLOSED', () => {
    const wo = buildClosableWo();
    const snapshot = wo.toSnapshot();
    const closed = WorkOrder.restore({ ...snapshot, status: WorkOrderStatus.CLOSED });

    expect(() => {
      closed.close(CLOSE_AT, validator);
    }).toThrow(InvalidStateTransitionError);
  });

  it('should throw WorkOrderClosingValidationError without before photo', () => {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000001',
      Quantity.of(100, UnitOfMeasure.ML),
      NOW,
      idGen,
    );
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000002',
      Quantity.of(2, UnitOfMeasure.PCS),
      NOW,
      idGen,
    );
    wo.pullDomainEvents();

    expect(() => {
      wo.close(CLOSE_AT, validator);
    }).toThrow(WorkOrderClosingValidationError);

    try {
      wo.close(CLOSE_AT, validator);
    } catch (e) {
      const err = e as WorkOrderClosingValidationError;
      expect(err.violations.some((v) => v.kind === 'NO_BEFORE_PHOTO')).toBe(true);
    }
  });

  it('should throw WorkOrderClosingValidationError without after photo', () => {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000001',
      Quantity.of(100, UnitOfMeasure.ML),
      NOW,
      idGen,
    );
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000002',
      Quantity.of(2, UnitOfMeasure.PCS),
      NOW,
      idGen,
    );
    wo.pullDomainEvents();

    expect(() => {
      wo.close(CLOSE_AT, validator);
    }).toThrow(WorkOrderClosingValidationError);
  });

  it('should throw WorkOrderClosingValidationError when deviation without reason', () => {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
    wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000001',
      Quantity.of(120, UnitOfMeasure.ML),
      NOW,
      idGen,
    );
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000002',
      Quantity.of(2, UnitOfMeasure.PCS),
      NOW,
      idGen,
    );
    wo.pullDomainEvents();

    expect(() => {
      wo.close(CLOSE_AT, validator);
    }).toThrow(WorkOrderClosingValidationError);

    try {
      wo.close(CLOSE_AT, validator);
    } catch (e) {
      const err = e as WorkOrderClosingValidationError;
      expect(err.violations.some((v) => v.kind === 'DEVIATION_WITHOUT_REASON')).toBe(true);
    }
  });

  it('should NOT throw when status remains unchanged after validation error', () => {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000001',
      Quantity.of(100, UnitOfMeasure.ML),
      NOW,
      idGen,
    );
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000002',
      Quantity.of(2, UnitOfMeasure.PCS),
      NOW,
      idGen,
    );
    wo.pullDomainEvents();

    try {
      wo.close(CLOSE_AT, validator);
    } catch {
      // expected
    }

    expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
  });
});

describe('WorkOrder.reopen', () => {
  const validator = new ClosingValidator();
  let idGen: FakeIdGenerator;

  beforeEach(() => {
    idGen = new FakeIdGenerator();
    resetPhotoCounter();
  });

  function buildClosedWo(): WorkOrder {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
    wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000001',
      Quantity.of(100, UnitOfMeasure.ML),
      NOW,
      idGen,
    );
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000002',
      Quantity.of(2, UnitOfMeasure.PCS),
      NOW,
      idGen,
    );
    wo.close(CLOSE_AT, validator);
    wo.pullDomainEvents();
    return wo;
  }

  it('should reopen from CLOSED to IN_PROGRESS', () => {
    const wo = buildClosedWo();

    wo.reopen('manager-1', 'correction needed', REOPEN_AT);

    expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
    expect(wo.toSnapshot().closedAt).toBeNull();
  });

  it('should emit WorkOrderReopened event', () => {
    const wo = buildClosedWo();

    wo.reopen('manager-1', 'correction needed', REOPEN_AT);

    const events = wo.pullDomainEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as WorkOrderReopened;
    expect(event).toBeInstanceOf(WorkOrderReopened);
    expect(event.reopenedBy).toBe('manager-1');
    expect(event.reason).toBe('correction needed');
  });

  it('should throw InvalidStateTransitionError when reopening from IN_PROGRESS', () => {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
    wo.pullDomainEvents();

    expect(() => {
      wo.reopen('manager-1', 'reason', REOPEN_AT);
    }).toThrow(InvalidStateTransitionError);
  });

  it('should throw InvalidStateTransitionError when reopening from CANCELLED', () => {
    const snapshot = new WorkOrderBuilder().withIdGen(idGen).build().toSnapshot();
    const cancelled = WorkOrder.restore({ ...snapshot, status: WorkOrderStatus.CANCELLED });

    expect(() => {
      cancelled.reopen('manager-1', 'reason', REOPEN_AT);
    }).toThrow(InvalidStateTransitionError);
  });

  it('should throw EmptyReopenReasonError when reason is empty', () => {
    const wo = buildClosedWo();

    expect(() => {
      wo.reopen('manager-1', '', REOPEN_AT);
    }).toThrow(EmptyReopenReasonError);
  });

  it('should throw EmptyReopenReasonError when reason is whitespace only', () => {
    const wo = buildClosedWo();

    expect(() => {
      wo.reopen('manager-1', '   ', REOPEN_AT);
    }).toThrow(EmptyReopenReasonError);
  });
});
