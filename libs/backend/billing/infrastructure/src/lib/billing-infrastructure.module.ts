import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, type OnModuleInit, type Provider } from '@nestjs/common';

import {
  BILLING_CONFIG,
  BillingApplicationModule,
  INVOICE_REPOSITORY,
  LIMITS_USAGE_PORT,
  PAYMENT_PROVIDER,
  SUBSCRIPTION_REPOSITORY,
} from '@det/backend-billing-application';
import {
  InvoiceIssued,
  InvoicePaid,
  InvoiceVoided,
  SubscriptionActivated,
  SubscriptionCancelled,
  SubscriptionMovedToPastDue,
  SubscriptionPeriodAdvanced,
  SubscriptionPlanChanged,
  SubscriptionReactivated,
  SubscriptionStartedTrial,
} from '@det/backend-billing-domain';
import { EventTypeRegistry, OutboxModule } from '@det/backend-shared-outbox';

import { BillingConfigAdapter } from '../adapters/billing-config.adapter';
import { LimitsUsageAdapter } from '../adapters/limits-usage.adapter';
import { MockPaymentProviderAdapter } from '../adapters/mock-payment-provider.adapter';
import { BilInvoiceSchema } from '../persistence/bil-invoice.schema';
import { BilPlanSchema } from '../persistence/bil-plan.schema';
import { BilSubscriptionSchema } from '../persistence/bil-subscription.schema';
import { BilInvoiceRepository } from '../repositories/bil-invoice.repository';
import { BilSubscriptionRepository } from '../repositories/bil-subscription.repository';

const BIL_SCHEMAS = [BilPlanSchema, BilSubscriptionSchema, BilInvoiceSchema];

const INFRASTRUCTURE_PROVIDERS: readonly Provider[] = [
  BilSubscriptionRepository,
  BilInvoiceRepository,
  MockPaymentProviderAdapter,
  LimitsUsageAdapter,
  BillingConfigAdapter,
  { provide: SUBSCRIPTION_REPOSITORY, useExisting: BilSubscriptionRepository },
  { provide: INVOICE_REPOSITORY, useExisting: BilInvoiceRepository },
  { provide: PAYMENT_PROVIDER, useExisting: MockPaymentProviderAdapter },
  { provide: LIMITS_USAGE_PORT, useExisting: LimitsUsageAdapter },
  { provide: BILLING_CONFIG, useExisting: BillingConfigAdapter },
];

@Module({
  exports: [BillingApplicationModule],
  imports: [
    BillingApplicationModule.register(INFRASTRUCTURE_PROVIDERS, [
      MikroOrmModule.forFeature(BIL_SCHEMAS),
      OutboxModule,
    ]),
  ],
})
export class BillingInfrastructureModule implements OnModuleInit {
  constructor(private readonly eventRegistry: EventTypeRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register([
      { ctor: SubscriptionStartedTrial, eventType: 'SubscriptionStartedTrial' },
      { ctor: SubscriptionActivated, eventType: 'SubscriptionActivated' },
      { ctor: SubscriptionReactivated, eventType: 'SubscriptionReactivated' },
      { ctor: SubscriptionMovedToPastDue, eventType: 'SubscriptionMovedToPastDue' },
      { ctor: SubscriptionCancelled, eventType: 'SubscriptionCancelled' },
      { ctor: SubscriptionPlanChanged, eventType: 'SubscriptionPlanChanged' },
      { ctor: SubscriptionPeriodAdvanced, eventType: 'SubscriptionPeriodAdvanced' },
      { ctor: InvoiceIssued, eventType: 'InvoiceIssued' },
      { ctor: InvoicePaid, eventType: 'InvoicePaid' },
      { ctor: InvoiceVoided, eventType: 'InvoiceVoided' },
    ]);
  }
}
