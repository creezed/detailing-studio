import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import { ClosingValidator } from './closing-validator';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { buildPhotoRef, resetPhotoCounter } from '../testing/photo-ref.builder';
import { WorkOrderBuilder } from '../testing/work-order.builder';
import { PhotoType } from '../value-objects/photo-type';

const NOW = DateTime.from('2024-06-15T10:00:00Z');

describe('ClosingValidator', () => {
  const validator = new ClosingValidator();
  let idGen: FakeIdGenerator;

  beforeEach(() => {
    idGen = new FakeIdGenerator();
    resetPhotoCounter();
  });

  function buildReadyWo() {
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

  it('should return empty violations for a valid work order', () => {
    const wo = buildReadyWo();
    expect(validator.validate(wo)).toHaveLength(0);
  });

  it('should report NO_BEFORE_PHOTO when no before photos', () => {
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

    const violations = validator.validate(wo);
    expect(violations).toContainEqual({ kind: 'NO_BEFORE_PHOTO' });
  });

  it('should report NO_AFTER_PHOTO when no after photos', () => {
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

    const violations = validator.validate(wo);
    expect(violations).toContainEqual({ kind: 'NO_AFTER_PHOTO' });
  });

  it('should report DEVIATION_WITHOUT_REASON when deviation > 15% and no reason', () => {
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

    const violations = validator.validate(wo);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      kind: 'DEVIATION_WITHOUT_REASON',
      skuId: '00000000-0000-4000-a000-111000000001',
    });
  });

  it('should NOT report deviation when reason is provided', () => {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
    wo.addPhotoBefore(buildPhotoRef({ type: PhotoType.BEFORE }), NOW);
    wo.addPhotoAfter(buildPhotoRef({ type: PhotoType.AFTER }), NOW);
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000001',
      Quantity.of(120, UnitOfMeasure.ML),
      NOW,
      idGen,
      'перерасход',
    );
    wo.addConsumption(
      '00000000-0000-4000-a000-111000000002',
      Quantity.of(2, UnitOfMeasure.PCS),
      NOW,
      idGen,
    );
    wo.pullDomainEvents();

    const violations = validator.validate(wo);
    expect(violations).toHaveLength(0);
  });

  it('should report all violations at once', () => {
    const wo = new WorkOrderBuilder().withIdGen(idGen).build();
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

    const violations = validator.validate(wo);
    const kinds = violations.map((v) => v.kind);
    expect(kinds).toContain('NO_BEFORE_PHOTO');
    expect(kinds).toContain('NO_AFTER_PHOTO');
    expect(kinds).toContain('DEVIATION_WITHOUT_REASON');
  });
});
