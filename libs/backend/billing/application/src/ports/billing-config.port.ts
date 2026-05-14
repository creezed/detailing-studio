export const BILLING_CONFIG = Symbol('BILLING_CONFIG');

export interface IBillingConfigPort {
  readonly demoBillingAutoPay: boolean;
}
