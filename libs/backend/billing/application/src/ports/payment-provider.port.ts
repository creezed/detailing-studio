import type { PaymentRef } from '@det/backend-billing-domain';
import type { Money } from '@det/backend-shared-ddd';

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'CANCELLED' | 'FAILED';
export type PaymentProvider = 'mock' | 'yookassa';

export interface IPaymentProviderPort {
  createPayment(input: {
    amount: Money;
    description: string;
    idempotencyKey: string;
  }): Promise<{ paymentRef: PaymentRef; redirectUrl: string | null }>;

  checkStatus(
    paymentRef: PaymentRef,
  ): Promise<{ status: PaymentStatus; provider: PaymentProvider }>;
}
