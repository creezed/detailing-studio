import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime, Money } from '@det/backend-shared-ddd';
import type { InvoiceId, SubscriptionId } from '@det/shared-types';

import type { PlanCode } from '../value-objects/plan-code';

const AGGREGATE_TYPE = 'Invoice';

function eventProps(id: InvoiceId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: id,
    aggregateType: AGGREGATE_TYPE,
    eventId: `${eventType}:${id}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class InvoiceIssued extends DomainEvent {
  readonly eventType = 'InvoiceIssued';

  constructor(
    public readonly invoiceId: InvoiceId,
    public readonly subscriptionId: SubscriptionId,
    public readonly planCode: PlanCode,
    public readonly amount: Money,
    public readonly issuedAt: DateTime,
  ) {
    super(eventProps(invoiceId, 'InvoiceIssued', issuedAt));
  }
}

export class InvoicePaid extends DomainEvent {
  readonly eventType = 'InvoicePaid';

  constructor(
    public readonly invoiceId: InvoiceId,
    public readonly subscriptionId: SubscriptionId,
    public readonly paidAt: DateTime,
  ) {
    super(eventProps(invoiceId, 'InvoicePaid', paidAt));
  }
}

export class InvoiceVoided extends DomainEvent {
  readonly eventType = 'InvoiceVoided';

  constructor(
    public readonly invoiceId: InvoiceId,
    public readonly reason: string,
    public readonly voidedAt: DateTime,
  ) {
    super(eventProps(invoiceId, 'InvoiceVoided', voidedAt));
  }
}
