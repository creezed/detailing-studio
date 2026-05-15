export { BillingApplicationModule } from './billing-application.module';

export { StartTrialCommand } from './commands/start-trial/start-trial.command';
export { ChangePlanCommand } from './commands/change-plan/change-plan.command';
export { CancelSubscriptionCommand } from './commands/cancel-subscription/cancel-subscription.command';
export { GenerateMonthlyInvoiceCommand } from './commands/generate-monthly-invoice/generate-monthly-invoice.command';
export { MarkInvoicePaidCommand } from './commands/mark-invoice-paid/mark-invoice-paid.command';
export { PayInvoiceCommand } from './commands/pay-invoice/pay-invoice.command';

export {
  GetCurrentSubscriptionQuery,
  type SubscriptionDto,
} from './queries/get-current-subscription/get-current-subscription.query';
export { ListInvoicesQuery, type InvoiceDto } from './queries/list-invoices/list-invoices.query';
export { GetInvoiceByIdQuery } from './queries/get-invoice-by-id/get-invoice-by-id.query';
export {
  GetTariffLimitsUsageQuery,
  type LimitsUsageReportDto,
} from './queries/get-tariff-limits-usage/get-tariff-limits-usage.query';

export {
  SUBSCRIPTION_REPOSITORY,
  INVOICE_REPOSITORY,
  PAYMENT_PROVIDER,
  LIMITS_USAGE_PORT,
  TENANT_CONTEXT,
  BILLING_CONFIG,
  CLOCK,
  ID_GENERATOR,
} from './di/tokens';

export {
  SubscriptionNotFoundError,
  TenantAlreadyHasSubscriptionError,
  InvoiceNotFoundError,
} from './errors/application.errors';

export type {
  IPaymentProviderPort,
  PaymentStatus,
  PaymentProvider,
} from './ports/payment-provider.port';
export type { ILimitsUsagePort } from './ports/limits-usage.port';
export type { ITenantContextPort } from './ports/tenant-context.port';
export type { IBillingConfigPort } from './ports/billing-config.port';

export { PlanCode } from '@det/backend-billing-domain';
export type { PaymentRef } from '@det/backend-billing-domain';

export type { SubscriptionId, InvoiceId, TenantId } from '@det/shared-types';
