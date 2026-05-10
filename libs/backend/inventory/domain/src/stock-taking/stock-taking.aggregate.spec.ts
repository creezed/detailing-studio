import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import { SkuId, UserId } from '@det/shared-types';

import { StockTakingStatus } from './stock-taking-status';
import {
  StockTakingAlreadyPostedError,
  StockTakingNotStartedError,
  StockTakingSkuNotFoundError,
} from './stock-taking.errors';
import { StockTakingCancelled, StockTakingPosted, StockTakingStarted } from './stock-taking.events';
import { StockTakingBuilder } from '../testing/stock-taking.builder';

const NOW = DateTime.from('2025-01-01T00:00:00Z');
const USER = UserId.from('44444444-4444-4444-a444-444444444444');
const SKU1 = SkuId.from('66666666-6666-4666-a666-666666666666');
const SKU2 = SkuId.from('77777777-7777-4777-a777-777777777777');

describe('StockTaking aggregate', () => {
  const builder = () => new StockTakingBuilder();

  describe('start', () => {
    it('should create STARTED stock taking with snapshot lines', () => {
      const st = builder().withLine(500).build();

      expect(st.status).toBe(StockTakingStatus.STARTED);
      expect(st.lines).toHaveLength(1);
      expect(st.lines[0]?.expectedQuantity.amount).toBe(500);
      expect(st.lines[0]?.actualQuantity).toBeNull();

      const events = st.pullDomainEvents();
      expect(events.some((e) => e instanceof StockTakingStarted)).toBe(true);
    });
  });

  describe('recordMeasurement', () => {
    it('should record actual quantity for existing SKU', () => {
      const st = builder().withLine(500, SKU1).build();
      st.pullDomainEvents();

      st.recordMeasurement(SKU1, Quantity.of(480, UnitOfMeasure.ML));

      expect(st.lines[0]?.actualQuantity?.amount).toBe(480);
      expect(st.lines[0]?.isMeasured).toBe(true);
    });

    it('should overwrite previous measurement', () => {
      const st = builder().withLine(500, SKU1).build();
      st.recordMeasurement(SKU1, Quantity.of(480, UnitOfMeasure.ML));
      st.recordMeasurement(SKU1, Quantity.of(490, UnitOfMeasure.ML));

      expect(st.lines[0]?.actualQuantity?.amount).toBe(490);
    });

    it('should throw StockTakingSkuNotFoundError for unknown SKU', () => {
      const st = builder().withLine(500, SKU1).build();
      const unknownSku = SkuId.from('99999999-9999-4999-a999-999999999999');

      expect(() => {
        st.recordMeasurement(unknownSku, Quantity.of(100, UnitOfMeasure.ML));
      }).toThrow(StockTakingSkuNotFoundError);
    });

    it('should throw StockTakingNotStartedError if POSTED', () => {
      const st = builder().withLine(500, SKU1).build();
      st.recordMeasurement(SKU1, Quantity.of(480, UnitOfMeasure.ML));
      st.post(USER, NOW);

      expect(() => {
        st.recordMeasurement(SKU1, Quantity.of(100, UnitOfMeasure.ML));
      }).toThrow(StockTakingAlreadyPostedError);
    });
  });

  describe('post', () => {
    it('should transition to POSTED and emit StockTakingPosted with deltas', () => {
      const st = builder().withLine(500, SKU1).withLine(200, SKU2).build();
      st.recordMeasurement(SKU1, Quantity.of(480, UnitOfMeasure.ML));
      st.recordMeasurement(SKU2, Quantity.of(200, UnitOfMeasure.ML));
      st.pullDomainEvents();

      st.post(USER, NOW);

      expect(st.status).toBe(StockTakingStatus.POSTED);
      const events = st.pullDomainEvents();
      const posted = events.find((e) => e instanceof StockTakingPosted);
      expect(posted).toBeDefined();
      // SKU1: 480-500 = -20 (included), SKU2: 200-200 = 0 (excluded)
      expect(posted?.deltas).toHaveLength(1);
      expect(posted?.deltas[0]?.delta.amount).toBe(-20);
    });

    it('should exclude unmeasured lines from deltas', () => {
      const st = builder().withLine(500, SKU1).withLine(200, SKU2).build();
      st.recordMeasurement(SKU1, Quantity.of(500, UnitOfMeasure.ML));
      st.pullDomainEvents();

      st.post(USER, NOW);

      const events = st.pullDomainEvents();
      const posted = events.find((e) => e instanceof StockTakingPosted);
      // SKU1: delta 0 excluded, SKU2: unmeasured excluded
      expect(posted?.deltas).toHaveLength(0);
    });

    it('should throw StockTakingAlreadyPostedError if already posted', () => {
      const st = builder().withLine(500, SKU1).build();
      st.recordMeasurement(SKU1, Quantity.of(480, UnitOfMeasure.ML));
      st.post(USER, NOW);

      expect(() => {
        st.post(USER, NOW);
      }).toThrow(StockTakingAlreadyPostedError);
    });
  });

  describe('cancel', () => {
    it('should transition STARTED → CANCELLED', () => {
      const st = builder().withLine(500).build();
      st.pullDomainEvents();

      st.cancel(NOW);

      expect(st.status).toBe(StockTakingStatus.CANCELLED);
      const events = st.pullDomainEvents();
      expect(events.some((e) => e instanceof StockTakingCancelled)).toBe(true);
    });

    it('should throw StockTakingNotStartedError if CANCELLED', () => {
      const st = builder().withLine(500).build();
      st.cancel(NOW);

      expect(() => {
        st.cancel(NOW);
      }).toThrow(StockTakingNotStartedError);
    });
  });

  describe('computeDelta', () => {
    it('should compute positive delta when actual > expected', () => {
      const st = builder().withLine(500, SKU1).build();
      st.recordMeasurement(SKU1, Quantity.of(550, UnitOfMeasure.ML));

      const delta = st.lines[0]?.computeDelta();
      expect(delta?.amount).toBe(50);
    });

    it('should compute negative delta when actual < expected', () => {
      const st = builder().withLine(500, SKU1).build();
      st.recordMeasurement(SKU1, Quantity.of(480, UnitOfMeasure.ML));

      const delta = st.lines[0]?.computeDelta();
      expect(delta?.amount).toBe(-20);
    });

    it('should return null when not measured', () => {
      const st = builder().withLine(500, SKU1).build();
      expect(st.lines[0]?.computeDelta()).toBeNull();
    });
  });
});
