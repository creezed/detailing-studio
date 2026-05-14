import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CancelSubscriptionHandler } from './commands/cancel-subscription/cancel-subscription.handler';
import { ChangePlanHandler } from './commands/change-plan/change-plan.handler';
import { GenerateMonthlyInvoiceHandler } from './commands/generate-monthly-invoice/generate-monthly-invoice.handler';
import { MarkInvoicePaidHandler } from './commands/mark-invoice-paid/mark-invoice-paid.handler';
import { PayInvoiceHandler } from './commands/pay-invoice/pay-invoice.handler';
import { StartTrialHandler } from './commands/start-trial/start-trial.handler';
import { SubscriptionMovedToPastDueHandler } from './event-handlers/subscription-moved-to-past-due.handler';
import { GetCurrentSubscriptionHandler } from './queries/get-current-subscription/get-current-subscription.handler';
import { GetInvoiceByIdHandler } from './queries/get-invoice-by-id/get-invoice-by-id.handler';
import { GetTariffLimitsUsageHandler } from './queries/get-tariff-limits-usage/get-tariff-limits-usage.handler';
import { ListInvoicesHandler } from './queries/list-invoices/list-invoices.handler';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  StartTrialHandler,
  ChangePlanHandler,
  CancelSubscriptionHandler,
  GenerateMonthlyInvoiceHandler,
  MarkInvoicePaidHandler,
  PayInvoiceHandler,
];

const QUERY_HANDLERS = [
  GetCurrentSubscriptionHandler,
  ListInvoicesHandler,
  GetInvoiceByIdHandler,
  GetTariffLimitsUsageHandler,
];

const EVENT_HANDLERS = [SubscriptionMovedToPastDueHandler];

@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class BillingApplicationModule {
  static register(
    providers: readonly Provider[],
    imports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    return {
      exports: [CqrsModule, ...providers],
      imports: [CqrsModule, ...imports],
      module: BillingApplicationModule,
      providers: [...providers, ...COMMAND_HANDLERS, ...QUERY_HANDLERS, ...EVENT_HANDLERS],
    };
  }
}
