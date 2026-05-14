import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'bil_subscription' })
export class BilSubscriptionSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'tenant_id', type: 'uuid' })
  declare tenantId: string;

  @Property({ fieldName: 'plan_code', type: 'text' })
  declare planCode: string;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ fieldName: 'current_period_started_at', type: 'timestamptz' })
  declare currentPeriodStartedAt: Date;

  @Property({ fieldName: 'next_billing_at', type: 'timestamptz' })
  declare nextBillingAt: Date;

  @Property({ fieldName: 'trial_ends_at', nullable: true, type: 'timestamptz' })
  declare trialEndsAt: Date | null;

  @Property({ fieldName: 'cancelled_at', nullable: true, type: 'timestamptz' })
  declare cancelledAt: Date | null;

  @Property({ fieldName: 'cancel_reason', nullable: true, type: 'text' })
  declare cancelReason: string | null;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
