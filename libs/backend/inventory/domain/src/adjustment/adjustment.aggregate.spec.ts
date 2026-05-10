import { DateTime, Money, UnitOfMeasure } from '@det/backend-shared-ddd';
import { BranchId, SkuId, UserId } from '@det/shared-types';

import { AdjustmentId } from './adjustment-id';
import { AdjustmentLine } from './adjustment-line';
import { AdjustmentStatus } from './adjustment-status';
import { Adjustment } from './adjustment.aggregate';
import { AdjustmentAlreadyDecidedError, EmptyAdjustmentError } from './adjustment.errors';
import { AdjustmentApproved, AdjustmentCreated, AdjustmentRejected } from './adjustment.events';
import { AdjustmentBuilder } from '../testing/adjustment.builder';
import { SignedQuantity } from '../value-objects/signed-quantity.value-object';

const NOW = DateTime.from('2025-01-01T00:00:00Z');
const OWNER = UserId.from('88888888-8888-4888-a888-888888888888');

describe('Adjustment aggregate', () => {
  const builder = () => new AdjustmentBuilder();

  describe('create', () => {
    it('should auto-approve if |totalAmount| < threshold', () => {
      const adj = builder().withLine(10, 100).withThreshold(50000).build();

      expect(adj.status).toBe(AdjustmentStatus.APPROVED);
      const events = adj.pullDomainEvents();
      expect(events.some((e) => e instanceof AdjustmentCreated)).toBe(true);
      expect(events.some((e) => e instanceof AdjustmentApproved)).toBe(true);
    });

    it('should set PENDING if |totalAmount| >= threshold', () => {
      const adj = builder().withLine(100, 100).withThreshold(50).build();

      expect(adj.status).toBe(AdjustmentStatus.PENDING);
      const events = adj.pullDomainEvents();
      expect(events.some((e) => e instanceof AdjustmentCreated)).toBe(true);
      expect(events.some((e) => e instanceof AdjustmentApproved)).toBe(false);
    });

    it('should handle negative delta', () => {
      const adj = builder().withLine(-50, 200).withThreshold(500000).build();

      expect(adj.status).toBe(AdjustmentStatus.APPROVED);
      expect(adj.totalAmountCents).toBeLessThan(0n);
    });

    it('should throw EmptyAdjustmentError if no lines', () => {
      expect(() => builder().build()).toThrow(EmptyAdjustmentError);
    });
  });

  describe('approve', () => {
    it('should transition PENDING → APPROVED and emit AdjustmentApproved', () => {
      const adj = builder().withLine(100, 100).withThreshold(1).build();
      adj.pullDomainEvents();

      adj.approve(OWNER, NOW);

      expect(adj.status).toBe(AdjustmentStatus.APPROVED);
      const events = adj.pullDomainEvents();
      expect(events.some((e) => e instanceof AdjustmentApproved)).toBe(true);
    });

    it('AdjustmentApproved event contains line snapshots', () => {
      const adj = builder().withLine(100, 100).withThreshold(1).build();
      adj.pullDomainEvents();

      adj.approve(OWNER, NOW);

      const events = adj.pullDomainEvents();
      const approved = events.find((e) => e instanceof AdjustmentApproved);
      expect(approved).toBeDefined();
      expect(approved?.lines).toHaveLength(1);
    });

    it('should throw AdjustmentAlreadyDecidedError if already approved', () => {
      const adj = builder().withLine(10, 100).withThreshold(500000).build();

      expect(() => {
        adj.approve(OWNER, NOW);
      }).toThrow(AdjustmentAlreadyDecidedError);
    });
  });

  describe('reject', () => {
    it('should transition PENDING → REJECTED and emit AdjustmentRejected', () => {
      const adj = builder().withLine(100, 100).withThreshold(1).build();
      adj.pullDomainEvents();

      adj.reject(OWNER, NOW, 'incorrect count');

      expect(adj.status).toBe(AdjustmentStatus.REJECTED);
      const events = adj.pullDomainEvents();
      expect(events.some((e) => e instanceof AdjustmentRejected)).toBe(true);
    });

    it('should throw AdjustmentAlreadyDecidedError if already rejected', () => {
      const adj = builder().withLine(100, 100).withThreshold(1).build();
      adj.reject(OWNER, NOW, 'first');

      expect(() => {
        adj.reject(OWNER, NOW, 'second');
      }).toThrow(AdjustmentAlreadyDecidedError);
    });
  });

  describe('totalAmountCents', () => {
    it('should compute correct total from multiple lines', () => {
      const adj = builder().withLine(10, 100).withLine(-5, 200).withThreshold(500000).build();

      // 10 * 10000 + (-5) * 20000 = 100000 - 100000 = 0
      expect(adj.totalAmountCents).toBe(0n);
    });
  });

  describe('restore', () => {
    it('should restore without emitting events', () => {
      const adj = Adjustment.restore(
        AdjustmentId.from('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
        BranchId.from('22222222-2222-4222-a222-222222222222'),
        AdjustmentStatus.PENDING,
        'test',
        [
          AdjustmentLine.create(
            SkuId.from('66666666-6666-4666-a666-666666666666'),
            SignedQuantity.of(10, UnitOfMeasure.ML),
            Money.rub(100),
          ),
        ],
        100000n,
        UserId.from('44444444-4444-4444-a444-444444444444'),
        null,
        NOW,
        null,
      );

      expect(adj.status).toBe(AdjustmentStatus.PENDING);
      expect(adj.pullDomainEvents()).toHaveLength(0);
    });
  });
});
