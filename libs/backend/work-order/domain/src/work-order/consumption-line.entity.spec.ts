import { InvalidQuantityError, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import { ConsumptionLine } from './consumption-line.entity';
import { FakeIdGenerator } from '../testing/fake-id-generator';

describe('ConsumptionLine entity', () => {
  const idGen = new FakeIdGenerator();

  beforeEach(() => {
    idGen.reset();
  });

  describe('draft', () => {
    it('should create a draft with zero actual amount', () => {
      const norm = Quantity.of(100, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);

      expect(line.skuId).toBe('sku-1');
      expect(line.actualAmount.amount).toBe(0);
      expect(line.actualAmount.unit).toBe(UnitOfMeasure.ML);
      expect(line.normAmount.amount).toBe(100);
      expect(line.normAmount.unit).toBe(UnitOfMeasure.ML);
      expect(line.deviationReason).toBeNull();
      expect(line.comment).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a line with actual amount and zero norm (out-of-norms)', () => {
      const actual = Quantity.of(50, UnitOfMeasure.ML);
      const line = ConsumptionLine.create('sku-2', actual, idGen, 'extra', 'needed more');

      expect(line.skuId).toBe('sku-2');
      expect(line.actualAmount.amount).toBe(50);
      expect(line.normAmount.amount).toBe(0);
      expect(line.deviationReason).toBe('extra');
      expect(line.comment).toBe('needed more');
    });
  });

  describe('update', () => {
    it('should update actual amount', () => {
      const norm = Quantity.of(100, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);

      line.update(Quantity.of(80, UnitOfMeasure.ML));

      expect(line.actualAmount.amount).toBe(80);
    });

    it('should update deviation reason and comment', () => {
      const norm = Quantity.of(100, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);

      line.update(Quantity.of(120, UnitOfMeasure.ML), 'spilled', 'oops');

      expect(line.deviationReason).toBe('spilled');
      expect(line.comment).toBe('oops');
    });

    it('should throw on negative actual amount', () => {
      const norm = Quantity.of(100, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);

      expect(() => {
        line.update(Quantity.of(-10, UnitOfMeasure.ML));
      }).toThrow(InvalidQuantityError);
    });
  });

  describe('currentDeviationRatio', () => {
    it('should return 0.25 for 100 actual / 80 norm', () => {
      const norm = Quantity.of(80, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);
      line.update(Quantity.of(100, UnitOfMeasure.ML));

      expect(line.currentDeviationRatio()).toBeCloseTo(0.25, 4);
    });

    it('should return 0.20 for 80 actual / 100 norm', () => {
      const norm = Quantity.of(100, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);
      line.update(Quantity.of(80, UnitOfMeasure.ML));

      expect(line.currentDeviationRatio()).toBeCloseTo(0.2, 4);
    });

    it('should return 0 when actual equals norm', () => {
      const norm = Quantity.of(100, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);
      line.update(Quantity.of(100, UnitOfMeasure.ML));

      expect(line.currentDeviationRatio()).toBe(0);
    });

    it('should return Infinity when norm is 0 and actual > 0', () => {
      const norm = Quantity.of(0, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);
      line.update(Quantity.of(50, UnitOfMeasure.ML));

      expect(line.currentDeviationRatio()).toBe(Infinity);
    });

    it('should return 0 when both norm and actual are 0', () => {
      const norm = Quantity.of(0, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);

      expect(line.currentDeviationRatio()).toBe(0);
    });
  });

  describe('restore + toSnapshot', () => {
    it('should round-trip through snapshot', () => {
      const norm = Quantity.of(100, UnitOfMeasure.ML);
      const line = ConsumptionLine.draft('sku-1', norm, idGen);
      line.update(Quantity.of(80, UnitOfMeasure.ML), 'leak', 'small leak');

      const snapshot = line.toSnapshot();
      const restored = ConsumptionLine.restore(snapshot);

      expect(restored.id).toBe(line.id);
      expect(restored.skuId).toBe(line.skuId);
      expect(restored.actualAmount.amount).toBe(80);
      expect(restored.normAmount.amount).toBe(100);
      expect(restored.deviationReason).toBe('leak');
      expect(restored.comment).toBe('small leak');
    });
  });
});
