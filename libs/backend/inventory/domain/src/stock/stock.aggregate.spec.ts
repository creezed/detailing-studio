import { DateTime, Money, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BranchId, SkuId } from '@det/shared-types';

import { BatchSourceType } from './batch-source-type';
import { Stock } from './stock.aggregate';
import { UnitMismatchError } from './stock.errors';
import { StockOpened, StockReceived, ReorderLevelChanged } from './stock.events';
import { StockBuilder } from '../testing/stock.builder';

const SKU = SkuId.from('11111111-1111-4111-a111-111111111111');
const BRANCH = BranchId.from('22222222-2222-4222-a222-222222222222');
const NOW = DateTime.from('2025-06-01T00:00:00Z');

let idCounter = 0;
const idGen: IIdGenerator = {
  generate(): string {
    idCounter += 1;

    return `aaaaaaaa-aaaa-4aaa-aaaa-${idCounter.toString().padStart(12, '0')}`;
  },
};

describe('Stock aggregate', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  describe('createEmpty', () => {
    it('should create stock with zero total and emit StockOpened', () => {
      const stock = Stock.createEmpty(
        SKU,
        BRANCH,
        UnitOfMeasure.ML,
        Quantity.of(100, UnitOfMeasure.ML),
        NOW,
      );

      expect(stock.totalQuantity().amount).toBe(0);
      expect(stock.averageCost.cents).toBe(0n);

      const events = stock.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(StockOpened);
    });
  });

  describe('receive', () => {
    it('should add batch and emit StockReceived', () => {
      const stock = Stock.createEmpty(
        SKU,
        BRANCH,
        UnitOfMeasure.ML,
        Quantity.of(100, UnitOfMeasure.ML),
        NOW,
      );
      stock.pullDomainEvents();

      stock.receive({
        expiresAt: null,
        idGen,
        quantity: Quantity.of(500, UnitOfMeasure.ML),
        receivedAt: NOW,
        sourceDocId: 'DOC-1',
        sourceType: BatchSourceType.RECEIPT,
        supplierId: null,
        unitCost: Money.rub(200),
      });

      expect(stock.totalQuantity().amount).toBe(500);
      expect(stock.batches).toHaveLength(1);

      const events = stock.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(StockReceived);
    });

    it('should set averageCost from first receive', () => {
      const stock = Stock.createEmpty(
        SKU,
        BRANCH,
        UnitOfMeasure.ML,
        Quantity.of(100, UnitOfMeasure.ML),
        NOW,
      );

      stock.receive({
        expiresAt: null,
        idGen,
        quantity: Quantity.of(100, UnitOfMeasure.ML),
        receivedAt: NOW,
        sourceDocId: 'DOC-1',
        sourceType: BatchSourceType.RECEIPT,
        supplierId: null,
        unitCost: Money.rub(50),
      });

      expect(stock.averageCost.cents).toBe(5000n);
    });

    it('should recalculate averageCost on second receive', () => {
      const stock = new StockBuilder().withReceive(100, 100).withReceive(100, 200).build();

      // (100*10000 + 100*20000) / 200 = 15000 cents = 150 rub
      expect(stock.averageCost.cents).toBe(15000n);
    });

    it('should recalculate averageCost weighted correctly', () => {
      const stock = new StockBuilder().withReceive(300, 100).withReceive(100, 200).build();

      // (300*10000 + 100*20000) / 400 = 5000000/400 = 12500 cents = 125 rub
      expect(stock.averageCost.cents).toBe(12500n);
    });

    it('should reject unit mismatch', () => {
      const stock = Stock.createEmpty(
        SKU,
        BRANCH,
        UnitOfMeasure.ML,
        Quantity.of(100, UnitOfMeasure.ML),
        NOW,
      );

      expect(() => {
        stock.receive({
          expiresAt: null,
          idGen,
          quantity: Quantity.of(10, UnitOfMeasure.KG),
          receivedAt: NOW,
          sourceDocId: 'DOC-1',
          sourceType: BatchSourceType.RECEIPT,
          supplierId: null,
          unitCost: Money.rub(50),
        });
      }).toThrow(UnitMismatchError);
    });
  });

  describe('totalQuantity', () => {
    it('should return zero for empty stock', () => {
      const stock = Stock.createEmpty(
        SKU,
        BRANCH,
        UnitOfMeasure.ML,
        Quantity.of(0, UnitOfMeasure.ML),
        NOW,
      );
      expect(stock.totalQuantity().amount).toBe(0);
    });

    it('should sum across multiple batches', () => {
      const stock = new StockBuilder().withReceive(100, 10).withReceive(250, 20).build();
      expect(stock.totalQuantity().amount).toBe(350);
    });
  });

  describe('changeReorderLevel', () => {
    it('should update reorder level and emit ReorderLevelChanged', () => {
      const stock = Stock.createEmpty(
        SKU,
        BRANCH,
        UnitOfMeasure.ML,
        Quantity.of(100, UnitOfMeasure.ML),
        NOW,
      );
      stock.pullDomainEvents();

      stock.changeReorderLevel(Quantity.of(200, UnitOfMeasure.ML), NOW);

      const snap = stock.toSnapshot();
      expect(snap.reorderLevel).toBe(200);

      const events = stock.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ReorderLevelChanged);
    });

    it('should reject unit mismatch', () => {
      const stock = Stock.createEmpty(
        SKU,
        BRANCH,
        UnitOfMeasure.ML,
        Quantity.of(100, UnitOfMeasure.ML),
        NOW,
      );

      expect(() => {
        stock.changeReorderLevel(Quantity.of(100, UnitOfMeasure.KG), NOW);
      }).toThrow(UnitMismatchError);
    });
  });

  describe('restore', () => {
    it('should restore from snapshot without events', () => {
      const stock = new StockBuilder().withReceive(500, 100).build();
      const snap = stock.toSnapshot();

      const restored = Stock.restore(snap);
      const restoredSnap = restored.toSnapshot();

      expect(restoredSnap.skuId).toBe(snap.skuId);
      expect(restoredSnap.branchId).toBe(snap.branchId);
      expect(restoredSnap.baseUnit).toBe(snap.baseUnit);
      expect(restoredSnap.reorderLevel).toBe(snap.reorderLevel);
      expect(restoredSnap.averageCostCents).toBe(snap.averageCostCents);
      expect(restoredSnap.batches).toHaveLength(snap.batches.length);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });

  describe('invariants', () => {
    it('totalQuantity >= 0 always', () => {
      const stock = Stock.createEmpty(
        SKU,
        BRANCH,
        UnitOfMeasure.ML,
        Quantity.of(0, UnitOfMeasure.ML),
        NOW,
      );
      expect(stock.totalQuantity().amount).toBeGreaterThanOrEqual(0);
    });

    it('Batch initialQuantity is immutable after receive', () => {
      const stock = new StockBuilder().withReceive(200, 50).build();
      const batch = stock.batches[0];
      expect(batch).toBeDefined();
      expect(batch?.initialQuantity.amount).toBe(200);
    });
  });
});
