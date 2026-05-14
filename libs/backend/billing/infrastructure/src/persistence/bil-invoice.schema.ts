import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'bil_invoice' })
export class BilInvoiceSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'subscription_id', type: 'uuid' })
  declare subscriptionId: string;

  @Property({ fieldName: 'plan_code', type: 'text' })
  declare planCode: string;

  @Property({ fieldName: 'amount_cents', type: 'bigint' })
  declare amountCents: string;

  @Property({ type: 'text' })
  declare currency: string;

  @Property({ fieldName: 'period_started_at', type: 'timestamptz' })
  declare periodStartedAt: Date;

  @Property({ fieldName: 'period_ends_at', type: 'timestamptz' })
  declare periodEndsAt: Date;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ fieldName: 'issued_at', type: 'timestamptz' })
  declare issuedAt: Date;

  @Property({ fieldName: 'paid_at', nullable: true, type: 'timestamptz' })
  declare paidAt: Date | null;

  @Property({ fieldName: 'voided_at', nullable: true, type: 'timestamptz' })
  declare voidedAt: Date | null;

  @Property({ fieldName: 'payment_ref', nullable: true, type: 'text' })
  declare paymentRef: string | null;
}
