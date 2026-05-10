import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime, Money, Quantity } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

import type { ReceiptId } from './receipt-id';

const RECEIPT_AGGREGATE_TYPE = 'Receipt';

function receiptEventProps(receiptId: ReceiptId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: receiptId as string,
    aggregateType: RECEIPT_AGGREGATE_TYPE,
    eventId: `${eventType}:${receiptId as string}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class ReceiptCreated extends DomainEvent {
  readonly eventType = 'ReceiptCreated';

  constructor(
    public readonly receiptId: ReceiptId,
    public readonly createdAt: DateTime,
  ) {
    super(receiptEventProps(receiptId, 'ReceiptCreated', createdAt));
  }
}

export class ReceiptLineAdded extends DomainEvent {
  readonly eventType = 'ReceiptLineAdded';

  constructor(
    public readonly receiptId: ReceiptId,
    public readonly lineId: string,
    public readonly at: DateTime,
  ) {
    super(receiptEventProps(receiptId, 'ReceiptLineAdded', at));
  }
}

export class ReceiptLineUpdated extends DomainEvent {
  readonly eventType = 'ReceiptLineUpdated';

  constructor(
    public readonly receiptId: ReceiptId,
    public readonly lineId: string,
    public readonly at: DateTime,
  ) {
    super(receiptEventProps(receiptId, 'ReceiptLineUpdated', at));
  }
}

export class ReceiptLineRemoved extends DomainEvent {
  readonly eventType = 'ReceiptLineRemoved';

  constructor(
    public readonly receiptId: ReceiptId,
    public readonly lineId: string,
    public readonly at: DateTime,
  ) {
    super(receiptEventProps(receiptId, 'ReceiptLineRemoved', at));
  }
}

export class ReceiptInvoiceAttached extends DomainEvent {
  readonly eventType = 'ReceiptInvoiceAttached';

  constructor(
    public readonly receiptId: ReceiptId,
    public readonly url: string,
    public readonly at: DateTime,
  ) {
    super(receiptEventProps(receiptId, 'ReceiptInvoiceAttached', at));
  }
}

export interface ReceiptLineSnapshot {
  readonly skuId: SkuId;
  readonly baseQuantity: Quantity;
  readonly unitCost: Money;
  readonly expiresAt: DateTime | null;
}

export class ReceiptPosted extends DomainEvent {
  readonly eventType = 'ReceiptPosted';

  constructor(
    public readonly receiptId: ReceiptId,
    public readonly supplierId: string,
    public readonly branchId: string,
    public readonly lines: readonly ReceiptLineSnapshot[],
    public readonly postedAt: DateTime,
  ) {
    super(receiptEventProps(receiptId, 'ReceiptPosted', postedAt));
  }
}

export class ReceiptCancelled extends DomainEvent {
  readonly eventType = 'ReceiptCancelled';

  constructor(
    public readonly receiptId: ReceiptId,
    public readonly reason: string,
    public readonly cancelledAt: DateTime,
  ) {
    super(receiptEventProps(receiptId, 'ReceiptCancelled', cancelledAt));
  }
}
