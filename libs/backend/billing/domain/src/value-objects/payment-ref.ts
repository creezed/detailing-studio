import type { Brand } from '@det/shared-types';

export type PaymentRef = Brand<string, 'PaymentRef'>;

export const PaymentRef = {
  from(value: string): PaymentRef {
    if (value.trim().length === 0) {
      throw new Error('PaymentRef cannot be empty');
    }

    return value as PaymentRef;
  },
};
