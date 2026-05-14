import { CLOCK, ID_GENERATOR } from '@det/backend-shared-ddd';

import { BILLING_CONFIG } from '../ports/billing-config.port';
import { LIMITS_USAGE_PORT } from '../ports/limits-usage.port';
import { PAYMENT_PROVIDER } from '../ports/payment-provider.port';
import { TENANT_CONTEXT } from '../ports/tenant-context.port';

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');

export { BILLING_CONFIG, CLOCK, ID_GENERATOR, LIMITS_USAGE_PORT, PAYMENT_PROVIDER, TENANT_CONTEXT };
