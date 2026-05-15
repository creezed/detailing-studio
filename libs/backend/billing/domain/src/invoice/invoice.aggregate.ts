import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime, Money } from '@det/backend-shared-ddd';
import type { InvoiceId, SubscriptionId } from '@det/shared-types';

import {
  InvoiceAlreadyPaidError,
  InvoiceAlreadyVoidedError,
  InvalidInvoiceTransitionError,
} from './invoice.errors';
import { InvoiceIssued, InvoicePaid, InvoiceVoided } from './invoice.events';
import { InvoiceStatus } from '../value-objects/invoice-status';

import type { PaymentRef } from '../value-objects/payment-ref';
import type { Period } from '../value-objects/period';
import type { PlanCode } from '../value-objects/plan-code';

export interface InvoiceSnapshot {
  readonly id: InvoiceId;
  readonly subscriptionId: SubscriptionId;
  readonly planCode: PlanCode;
  readonly amount: Money;
  readonly period: Period;
  readonly status: InvoiceStatus;
  readonly issuedAt: DateTime;
  readonly paidAt: DateTime | null;
  readonly voidedAt: DateTime | null;
  readonly paymentRef: PaymentRef | null;
}

export interface IssueInvoiceProps {
  readonly id: InvoiceId;
  readonly subscriptionId: SubscriptionId;
  readonly planCode: PlanCode;
  readonly amount: Money;
  readonly period: Period;
  readonly now: DateTime;
}

export class Invoice extends AggregateRoot<InvoiceId> {
  private constructor(
    private readonly _id: InvoiceId,
    private readonly _subscriptionId: SubscriptionId,
    private readonly _planCode: PlanCode,
    private readonly _amount: Money,
    private readonly _period: Period,
    private _status: InvoiceStatus,
    private readonly _issuedAt: DateTime,
    private _paidAt: DateTime | null,
    private _voidedAt: DateTime | null,
    private _paymentRef: PaymentRef | null,
  ) {
    super();
  }

  get id(): InvoiceId {
    return this._id;
  }

  static issue(props: IssueInvoiceProps): Invoice {
    const inv = new Invoice(
      props.id,
      props.subscriptionId,
      props.planCode,
      props.amount,
      props.period,
      InvoiceStatus.ISSUED,
      props.now,
      null,
      null,
      null,
    );

    inv.addEvent(
      new InvoiceIssued(props.id, props.subscriptionId, props.planCode, props.amount, props.now),
    );

    return inv;
  }

  static restore(snapshot: InvoiceSnapshot): Invoice {
    return new Invoice(
      snapshot.id,
      snapshot.subscriptionId,
      snapshot.planCode,
      snapshot.amount,
      snapshot.period,
      snapshot.status,
      snapshot.issuedAt,
      snapshot.paidAt,
      snapshot.voidedAt,
      snapshot.paymentRef,
    );
  }

  markPaid(props: { paymentRef: PaymentRef; now: DateTime }): void {
    if (this._status === InvoiceStatus.PAID) {
      throw new InvoiceAlreadyPaidError();
    }

    if (this._status === InvoiceStatus.VOIDED) {
      throw new InvalidInvoiceTransitionError(InvoiceStatus.VOIDED, InvoiceStatus.PAID);
    }

    this._status = InvoiceStatus.PAID;
    this._paidAt = props.now;
    this._paymentRef = props.paymentRef;
    this.addEvent(new InvoicePaid(this._id, this._subscriptionId, props.now));
  }

  markVoided(props: { reason: string; now: DateTime }): void {
    if (this._status === InvoiceStatus.VOIDED) {
      throw new InvoiceAlreadyVoidedError();
    }

    if (this._status === InvoiceStatus.PAID) {
      throw new InvalidInvoiceTransitionError(InvoiceStatus.PAID, InvoiceStatus.VOIDED);
    }

    this._status = InvoiceStatus.VOIDED;
    this._voidedAt = props.now;
    this.addEvent(new InvoiceVoided(this._id, props.reason, props.now));
  }

  toSnapshot(): InvoiceSnapshot {
    return {
      id: this._id,
      subscriptionId: this._subscriptionId,
      planCode: this._planCode,
      amount: this._amount,
      period: this._period,
      status: this._status,
      issuedAt: this._issuedAt,
      paidAt: this._paidAt,
      voidedAt: this._voidedAt,
      paymentRef: this._paymentRef,
    };
  }
}
