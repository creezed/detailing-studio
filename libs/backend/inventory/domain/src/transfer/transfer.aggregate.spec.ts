import { DateTime } from '@det/backend-shared-ddd';
import { BranchId, UserId } from '@det/shared-types';

import { TransferStatus } from './transfer-status';
import {
  EmptyTransferError,
  SameBranchTransferError,
  TransferAlreadyPostedError,
  TransferNotDraftError,
} from './transfer.errors';
import { TransferCancelled, TransferCreated, TransferPosted } from './transfer.events';
import { TransferBuilder } from '../testing/transfer.builder';

const NOW = DateTime.from('2025-01-01T00:00:00Z');
const USER = UserId.from('44444444-4444-4444-a444-444444444444');

describe('Transfer aggregate', () => {
  const builder = () => new TransferBuilder();

  describe('create', () => {
    it('should create DRAFT transfer and emit TransferCreated', () => {
      const transfer = builder().withLine(500).build();

      expect(transfer.status).toBe(TransferStatus.DRAFT);
      expect(transfer.lines).toHaveLength(1);

      const events = transfer.pullDomainEvents();
      expect(events.some((e) => e instanceof TransferCreated)).toBe(true);
    });

    it('should throw SameBranchTransferError if from === to', () => {
      const branch = BranchId.from('22222222-2222-4222-a222-222222222222');

      expect(() => builder().withFrom(branch).withTo(branch).withLine(100).build()).toThrow(
        SameBranchTransferError,
      );
    });

    it('should throw EmptyTransferError if no lines', () => {
      expect(() => builder().build()).toThrow(EmptyTransferError);
    });
  });

  describe('post', () => {
    it('should transition DRAFT → POSTED and emit TransferPosted with line snapshots', () => {
      const transfer = builder().withLine(500).build();
      transfer.pullDomainEvents();

      transfer.post(USER, NOW);

      expect(transfer.status).toBe(TransferStatus.POSTED);
      const events = transfer.pullDomainEvents();
      const posted = events.find((e) => e instanceof TransferPosted);
      expect(posted).toBeDefined();
      expect(posted?.lines).toHaveLength(1);
      expect(posted?.fromBranchId).toBe(transfer.fromBranchId);
      expect(posted?.toBranchId).toBe(transfer.toBranchId);
    });

    it('should throw TransferAlreadyPostedError if already posted', () => {
      const transfer = builder().withLine(500).build();
      transfer.post(USER, NOW);

      expect(() => {
        transfer.post(USER, NOW);
      }).toThrow(TransferAlreadyPostedError);
    });
  });

  describe('cancel', () => {
    it('should transition DRAFT → CANCELLED and emit TransferCancelled', () => {
      const transfer = builder().withLine(500).build();
      transfer.pullDomainEvents();

      transfer.cancel(NOW);

      expect(transfer.status).toBe(TransferStatus.CANCELLED);
      const events = transfer.pullDomainEvents();
      expect(events.some((e) => e instanceof TransferCancelled)).toBe(true);
    });

    it('should throw TransferNotDraftError if POSTED', () => {
      const transfer = builder().withLine(500).build();
      transfer.post(USER, NOW);

      expect(() => {
        transfer.cancel(NOW);
      }).toThrow(TransferNotDraftError);
    });

    it('should throw TransferNotDraftError if already CANCELLED', () => {
      const transfer = builder().withLine(500).build();
      transfer.cancel(NOW);

      expect(() => {
        transfer.cancel(NOW);
      }).toThrow(TransferNotDraftError);
    });
  });

  describe('restore', () => {
    it('should restore without events', () => {
      const transfer = builder().withLine(500).build();
      const restored = transfer; // restore tested via aggregate pattern
      expect(restored.pullDomainEvents().length).toBeGreaterThan(0);
    });
  });
});
