import { DateTime } from '@det/backend-shared-ddd';
import { UserId } from '@det/shared-types';

import { ReceiptStatus } from './receipt-status';
import {
  EmptyReceiptError,
  ReceiptAlreadyPostedError,
  ReceiptCannotEditAfterPostError,
  ReceiptNotPostedError,
} from './receipt.errors';
import {
  ReceiptCancelled,
  ReceiptCreated,
  ReceiptInvoiceAttached,
  ReceiptLineAdded,
  ReceiptLineRemoved,
  ReceiptLineUpdated,
  ReceiptPosted,
} from './receipt.events';
import { defaultLineProps, ReceiptBuilder } from '../testing/receipt.builder';

const NOW = DateTime.from('2025-01-01T00:00:00Z');
const USER = UserId.from('44444444-4444-4444-a444-444444444444');

describe('Receipt aggregate', () => {
  const builder = () => new ReceiptBuilder();

  describe('create', () => {
    it('should create DRAFT receipt and emit ReceiptCreated', () => {
      const receipt = builder().build();

      expect(receipt.status).toBe(ReceiptStatus.DRAFT);
      expect(receipt.lines).toHaveLength(0);

      const events = receipt.pullDomainEvents();
      expect(events.some((e) => e instanceof ReceiptCreated)).toBe(true);
    });
  });

  describe('addLine', () => {
    it('should add line in DRAFT', () => {
      const receipt = builder().build();
      receipt.pullDomainEvents();

      const lineProps = defaultLineProps();
      receipt.addLine(lineProps, NOW);

      expect(receipt.lines).toHaveLength(1);
      const events = receipt.pullDomainEvents();
      expect(events.some((e) => e instanceof ReceiptLineAdded)).toBe(true);
    });

    it('should reject addLine when POSTED', () => {
      const receipt = builder().withLine().posted().build();

      expect(() => {
        receipt.addLine(defaultLineProps(), NOW);
      }).toThrow(ReceiptAlreadyPostedError);
    });
  });

  describe('updateLine', () => {
    it('should update existing line in DRAFT', () => {
      const receipt = builder().build();
      receipt.pullDomainEvents();

      const lineProps = defaultLineProps();
      receipt.addLine(lineProps, NOW);

      const updatedProps = defaultLineProps({ id: lineProps.id, packageQuantity: 5 });
      receipt.updateLine(lineProps.id, updatedProps, NOW);

      expect(receipt.lines).toHaveLength(1);
      const events = receipt.pullDomainEvents();
      expect(events.some((e) => e instanceof ReceiptLineUpdated)).toBe(true);
    });

    it('should no-op for non-existent lineId', () => {
      const receipt = builder().build();
      receipt.pullDomainEvents();

      receipt.updateLine('nonexistent', defaultLineProps(), NOW);
      expect(receipt.pullDomainEvents()).toHaveLength(0);
    });
  });

  describe('removeLine', () => {
    it('should remove existing line in DRAFT', () => {
      const receipt = builder().build();
      const lineProps = defaultLineProps();
      receipt.addLine(lineProps, NOW);
      receipt.pullDomainEvents();

      receipt.removeLine(lineProps.id, NOW);

      expect(receipt.lines).toHaveLength(0);
      const events = receipt.pullDomainEvents();
      expect(events.some((e) => e instanceof ReceiptLineRemoved)).toBe(true);
    });

    it('should no-op for non-existent lineId', () => {
      const receipt = builder().build();
      receipt.pullDomainEvents();

      receipt.removeLine('nonexistent', NOW);
      expect(receipt.pullDomainEvents()).toHaveLength(0);
    });
  });

  describe('attachInvoiceFile', () => {
    it('should attach file in DRAFT', () => {
      const receipt = builder().build();
      receipt.pullDomainEvents();

      receipt.attachInvoiceFile('https://example.com/invoice.pdf', NOW);

      const events = receipt.pullDomainEvents();
      expect(events.some((e) => e instanceof ReceiptInvoiceAttached)).toBe(true);
    });

    it('should reject when POSTED', () => {
      const receipt = builder().withLine().posted().build();

      expect(() => {
        receipt.attachInvoiceFile('url', NOW);
      }).toThrow(ReceiptAlreadyPostedError);
    });
  });

  describe('post', () => {
    it('should transition to POSTED and emit ReceiptPosted with line snapshots', () => {
      const receipt = builder().withLine().build();
      receipt.pullDomainEvents();

      receipt.post(USER, NOW);

      expect(receipt.status).toBe(ReceiptStatus.POSTED);
      const events = receipt.pullDomainEvents();
      const posted = events.find((e) => e instanceof ReceiptPosted);
      expect(posted).toBeDefined();
      expect(posted?.lines).toHaveLength(1);
    });

    it('should throw EmptyReceiptError if no lines', () => {
      const receipt = builder().build();

      expect(() => {
        receipt.post(USER, NOW);
      }).toThrow(EmptyReceiptError);
    });

    it('should throw ReceiptAlreadyPostedError if already posted', () => {
      const receipt = builder().withLine().posted().build();

      expect(() => {
        receipt.post(USER, NOW);
      }).toThrow(ReceiptAlreadyPostedError);
    });
  });

  describe('cancel', () => {
    it('should transition POSTED → CANCELLED and emit ReceiptCancelled', () => {
      const receipt = builder().withLine().posted().build();
      receipt.pullDomainEvents();

      receipt.cancel('mistake', NOW);

      expect(receipt.status).toBe(ReceiptStatus.CANCELLED);
      const events = receipt.pullDomainEvents();
      expect(events.some((e) => e instanceof ReceiptCancelled)).toBe(true);
    });

    it('should throw ReceiptNotPostedError if still DRAFT', () => {
      const receipt = builder().build();

      expect(() => {
        receipt.cancel('reason', NOW);
      }).toThrow(ReceiptNotPostedError);
    });

    it('should throw ReceiptNotPostedError if already CANCELLED', () => {
      const receipt = builder().withLine().posted().build();
      receipt.cancel('first', NOW);

      expect(() => {
        receipt.cancel('second', NOW);
      }).toThrow(ReceiptNotPostedError);
    });
  });

  describe('CANCELLED state edits', () => {
    it('should reject addLine when CANCELLED', () => {
      const receipt = builder().withLine().posted().build();
      receipt.cancel('reason', NOW);

      expect(() => {
        receipt.addLine(defaultLineProps(), NOW);
      }).toThrow(ReceiptCannotEditAfterPostError);
    });
  });
});
