import { DateTime, Money } from '@det/backend-shared-ddd';
import { InvoiceId, SubscriptionId } from '@det/shared-types';

import { Invoice } from './invoice.aggregate';
import {
  InvoiceAlreadyPaidError,
  InvoiceAlreadyVoidedError,
  InvalidInvoiceTransitionError,
} from './invoice.errors';
import { InvoiceIssued, InvoicePaid, InvoiceVoided } from './invoice.events';
import { InvoiceStatus } from '../value-objects/invoice-status';
import { PaymentRef } from '../value-objects/payment-ref';
import { Period } from '../value-objects/period';
import { PlanCode } from '../value-objects/plan-code';

const INV_ID = InvoiceId.from('00000000-0000-4000-a000-000000000010');
const SUB_ID = SubscriptionId.from('00000000-0000-4000-a000-000000000001');
const NOW = DateTime.from('2025-06-01T00:00:00Z');
const PERIOD = new Period(NOW, NOW.plusMonths(1));
const AMOUNT = Money.rub(2990);

function issuedInvoice(): Invoice {
  const inv = Invoice.issue({
    id: INV_ID,
    subscriptionId: SUB_ID,
    planCode: PlanCode.STARTER,
    amount: AMOUNT,
    period: PERIOD,
    now: NOW,
  });
  inv.pullDomainEvents();

  return inv;
}

function paidInvoice(): Invoice {
  const inv = issuedInvoice();
  inv.markPaid({ paymentRef: PaymentRef.from('pay_123'), now: NOW.plusDays(1) });
  inv.pullDomainEvents();

  return inv;
}

function voidedInvoice(): Invoice {
  const inv = issuedInvoice();
  inv.markVoided({ reason: 'plan changed', now: NOW.plusDays(1) });
  inv.pullDomainEvents();

  return inv;
}

describe('Invoice', () => {
  describe('issue', () => {
    it('should create an ISSUED invoice', () => {
      const inv = Invoice.issue({
        id: INV_ID,
        subscriptionId: SUB_ID,
        planCode: PlanCode.STARTER,
        amount: AMOUNT,
        period: PERIOD,
        now: NOW,
      });

      const snap = inv.toSnapshot();
      expect(snap.status).toBe(InvoiceStatus.ISSUED);
      expect(snap.planCode).toBe(PlanCode.STARTER);
      expect(snap.amount.equals(AMOUNT)).toBe(true);
      expect(snap.paidAt).toBeNull();
      expect(snap.voidedAt).toBeNull();
      expect(snap.paymentRef).toBeNull();
    });

    it('should emit InvoiceIssued event', () => {
      const inv = Invoice.issue({
        id: INV_ID,
        subscriptionId: SUB_ID,
        planCode: PlanCode.STARTER,
        amount: AMOUNT,
        period: PERIOD,
        now: NOW,
      });

      const events = inv.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(InvoiceIssued);

      const event = events[0] as InvoiceIssued;
      expect(event.invoiceId).toBe(INV_ID);
      expect(event.subscriptionId).toBe(SUB_ID);
      expect(event.planCode).toBe(PlanCode.STARTER);
    });
  });

  describe('markPaid', () => {
    it('should transition ISSUED → PAID', () => {
      const inv = issuedInvoice();
      const payRef = PaymentRef.from('pay_abc');
      inv.markPaid({ paymentRef: payRef, now: NOW.plusDays(1) });

      const snap = inv.toSnapshot();
      expect(snap.status).toBe(InvoiceStatus.PAID);
      expect(snap.paymentRef).toBe(payRef);
      expect(snap.paidAt).not.toBeNull();
    });

    it('should emit InvoicePaid event', () => {
      const inv = issuedInvoice();
      inv.markPaid({ paymentRef: PaymentRef.from('pay_abc'), now: NOW.plusDays(1) });

      const events = inv.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(InvoicePaid);
    });

    it('should throw on already PAID', () => {
      const inv = paidInvoice();
      expect(() => {
        inv.markPaid({ paymentRef: PaymentRef.from('pay_dup'), now: NOW.plusDays(2) });
      }).toThrow(InvoiceAlreadyPaidError);
    });

    it('should throw on VOIDED → PAID', () => {
      const inv = voidedInvoice();
      expect(() => {
        inv.markPaid({ paymentRef: PaymentRef.from('pay_x'), now: NOW.plusDays(2) });
      }).toThrow(InvalidInvoiceTransitionError);
    });
  });

  describe('markVoided', () => {
    it('should transition ISSUED → VOIDED', () => {
      const inv = issuedInvoice();
      inv.markVoided({ reason: 'tariff changed', now: NOW.plusDays(1) });

      const snap = inv.toSnapshot();
      expect(snap.status).toBe(InvoiceStatus.VOIDED);
      expect(snap.voidedAt).not.toBeNull();
    });

    it('should emit InvoiceVoided event', () => {
      const inv = issuedInvoice();
      inv.markVoided({ reason: 'tariff changed', now: NOW.plusDays(1) });

      const events = inv.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(InvoiceVoided);

      const event = events[0] as InvoiceVoided;
      expect(event.reason).toBe('tariff changed');
    });

    it('should throw on already VOIDED', () => {
      const inv = voidedInvoice();
      expect(() => {
        inv.markVoided({ reason: 'again', now: NOW.plusDays(3) });
      }).toThrow(InvoiceAlreadyVoidedError);
    });

    it('should throw on PAID → VOIDED', () => {
      const inv = paidInvoice();
      expect(() => {
        inv.markVoided({ reason: 'late', now: NOW.plusDays(3) });
      }).toThrow(InvalidInvoiceTransitionError);
    });
  });

  describe('restore + toSnapshot round-trip', () => {
    it('should restore from snapshot correctly', () => {
      const inv = Invoice.issue({
        id: INV_ID,
        subscriptionId: SUB_ID,
        planCode: PlanCode.STARTER,
        amount: AMOUNT,
        period: PERIOD,
        now: NOW,
      });

      const snapshot = inv.toSnapshot();
      const restored = Invoice.restore(snapshot);
      const restoredSnapshot = restored.toSnapshot();

      expect(restoredSnapshot.id).toBe(snapshot.id);
      expect(restoredSnapshot.subscriptionId).toBe(snapshot.subscriptionId);
      expect(restoredSnapshot.status).toBe(snapshot.status);
      expect(restoredSnapshot.amount.equals(snapshot.amount)).toBe(true);
    });

    it('should not emit events on restore', () => {
      const inv = Invoice.issue({
        id: INV_ID,
        subscriptionId: SUB_ID,
        planCode: PlanCode.STARTER,
        amount: AMOUNT,
        period: PERIOD,
        now: NOW,
      });

      const restored = Invoice.restore(inv.toSnapshot());
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });
});
