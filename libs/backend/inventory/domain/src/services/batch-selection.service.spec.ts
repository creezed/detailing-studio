import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import { BatchSelectionStrategy } from './batch-selection-strategy';
import { BatchSelectionService } from './batch-selection.service';
import { BatchBuilder } from '../testing/batch.builder';

const NOW = DateTime.from('2025-06-15T12:00:00Z');

describe('BatchSelectionService', () => {
  describe('FEFO strategy', () => {
    const service = new BatchSelectionService(BatchSelectionStrategy.FEFO);

    it('should select batch expiring earliest first', () => {
      const b1 = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(DateTime.from('2025-12-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();
      const b2 = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(DateTime.from('2025-07-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-02-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption(
        [b1, b2],
        Quantity.of(300, UnitOfMeasure.ML),
        NOW,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.batchId).toBe(b2.id);
      expect(result[0]?.quantity.amount).toBe(300);
    });

    it('should put null-expiry batches last', () => {
      const bNoExpiry = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(null)
        .withReceivedAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();
      const bWithExpiry = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(DateTime.from('2025-12-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-02-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption(
        [bNoExpiry, bWithExpiry],
        Quantity.of(300, UnitOfMeasure.ML),
        NOW,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.batchId).toBe(bWithExpiry.id);
    });

    it('should break tie on expiresAt by receivedAt', () => {
      const bOlder = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(DateTime.from('2025-12-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();
      const bNewer = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(DateTime.from('2025-12-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-03-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption(
        [bNewer, bOlder],
        Quantity.of(300, UnitOfMeasure.ML),
        NOW,
      );

      expect(result[0]?.batchId).toBe(bOlder.id);
    });

    it('should exclude expired batches', () => {
      const expired = new BatchBuilder()
        .withQuantity(1000)
        .withExpiresAt(DateTime.from('2025-06-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();
      const valid = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(DateTime.from('2025-12-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-02-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption(
        [expired, valid],
        Quantity.of(300, UnitOfMeasure.ML),
        NOW,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.batchId).toBe(valid.id);
    });

    it('should take partial from last batch', () => {
      const b1 = new BatchBuilder()
        .withQuantity(200)
        .withExpiresAt(DateTime.from('2025-07-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();
      const b2 = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(DateTime.from('2025-12-01T00:00:00Z'))
        .withReceivedAt(DateTime.from('2025-02-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption(
        [b1, b2],
        Quantity.of(300, UnitOfMeasure.ML),
        NOW,
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.quantity.amount).toBe(200);
      expect(result[1]?.quantity.amount).toBe(100);
    });

    it('should return insufficient allocations when stock is not enough', () => {
      const b1 = new BatchBuilder()
        .withQuantity(100)
        .withExpiresAt(null)
        .withReceivedAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption([b1], Quantity.of(500, UnitOfMeasure.ML), NOW);

      const totalAllocated = result.reduce((sum, a) => sum + a.quantity.amount, 0);
      expect(totalAllocated).toBeLessThan(500);
    });
  });

  describe('FIFO strategy', () => {
    const service = new BatchSelectionService(BatchSelectionStrategy.FIFO);

    it('should select by receivedAt ascending', () => {
      const bOlder = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(null)
        .withReceivedAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();
      const bNewer = new BatchBuilder()
        .withQuantity(500)
        .withExpiresAt(null)
        .withReceivedAt(DateTime.from('2025-03-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption(
        [bNewer, bOlder],
        Quantity.of(300, UnitOfMeasure.ML),
        NOW,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.batchId).toBe(bOlder.id);
    });

    it('should skip depleted batches', () => {
      const depleted = new BatchBuilder().withQuantity(0).build();
      const available = new BatchBuilder()
        .withQuantity(500)
        .withReceivedAt(DateTime.from('2025-02-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption(
        [depleted, available],
        Quantity.of(300, UnitOfMeasure.ML),
        NOW,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.batchId).toBe(available.id);
    });

    it('should handle exact amount match', () => {
      const batch = new BatchBuilder()
        .withQuantity(500)
        .withReceivedAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption([batch], Quantity.of(500, UnitOfMeasure.ML), NOW);

      expect(result).toHaveLength(1);
      expect(result[0]?.quantity.amount).toBe(500);
    });

    it('should return empty if no valid batches', () => {
      const expired = new BatchBuilder()
        .withQuantity(1000)
        .withExpiresAt(DateTime.from('2025-01-01T00:00:00Z'))
        .build();

      const result = service.selectForConsumption(
        [expired],
        Quantity.of(100, UnitOfMeasure.ML),
        NOW,
      );

      expect(result).toHaveLength(0);
    });
  });
});
