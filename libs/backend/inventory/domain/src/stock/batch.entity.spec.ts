import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import { BatchInsufficientError, UnitMismatchError } from './stock.errors';
import { BatchBuilder } from '../testing/batch.builder';

describe('Batch entity', () => {
  const builder = () => new BatchBuilder();

  describe('create', () => {
    it('should create with initial = remaining', () => {
      const batch = builder().withQuantity(500).build();
      expect(batch.initialQuantity.amount).toBe(500);
      expect(batch.remainingQuantity.amount).toBe(500);
    });

    it('should reject mismatched unit', () => {
      expect(() =>
        builder().withBaseUnit(UnitOfMeasure.ML).withQuantity(10, UnitOfMeasure.KG).build(),
      ).toThrow(UnitMismatchError);
    });
  });

  describe('decrement', () => {
    it('should decrease remaining quantity', () => {
      const batch = builder().withQuantity(100).build();
      batch.decrement(Quantity.of(30, UnitOfMeasure.ML));
      expect(batch.remainingQuantity.amount).toBe(70);
    });

    it('should decrement to zero', () => {
      const batch = builder().withQuantity(50).build();
      batch.decrement(Quantity.of(50, UnitOfMeasure.ML));
      expect(batch.remainingQuantity.amount).toBe(0);
      expect(batch.isDepleted()).toBe(true);
    });

    it('should throw BatchInsufficientError if amount > remaining', () => {
      const batch = builder().withQuantity(10).build();
      expect(() => {
        batch.decrement(Quantity.of(11, UnitOfMeasure.ML));
      }).toThrow(BatchInsufficientError);
    });
  });

  describe('isDepleted', () => {
    it('should return false when remaining > 0', () => {
      expect(builder().withQuantity(1).build().isDepleted()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false when expiresAt is null', () => {
      const batch = builder().withExpiresAt(null).build();
      expect(batch.isExpired(DateTime.from('2099-01-01T00:00:00Z'))).toBe(false);
    });

    it('should return true when at >= expiresAt', () => {
      const batch = builder().withExpiresAt(DateTime.from('2025-06-01T00:00:00Z')).build();
      expect(batch.isExpired(DateTime.from('2025-06-01T00:00:00Z'))).toBe(true);
      expect(batch.isExpired(DateTime.from('2025-06-02T00:00:00Z'))).toBe(true);
    });

    it('should return false when at < expiresAt', () => {
      const batch = builder().withExpiresAt(DateTime.from('2025-06-01T00:00:00Z')).build();
      expect(batch.isExpired(DateTime.from('2025-05-31T00:00:00Z'))).toBe(false);
    });
  });

  describe('immutability', () => {
    it('initialQuantity and unitCost do not change after decrement', () => {
      const batch = builder().withQuantity(100).withUnitCost(50).build();
      batch.decrement(Quantity.of(60, UnitOfMeasure.ML));

      expect(batch.initialQuantity.amount).toBe(100);
      expect(batch.unitCost.cents).toBe(5000n);
    });
  });
});
