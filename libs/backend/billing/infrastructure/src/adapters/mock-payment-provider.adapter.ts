import { Inject, Injectable, Logger } from '@nestjs/common';

import { ID_GENERATOR } from '@det/backend-billing-application';
import type {
  IPaymentProviderPort,
  PaymentProvider,
  PaymentStatus,
} from '@det/backend-billing-application';
import { PaymentRef } from '@det/backend-billing-domain';
import type { IIdGenerator, Money } from '@det/backend-shared-ddd';

@Injectable()
export class MockPaymentProviderAdapter implements IPaymentProviderPort {
  private readonly logger = new Logger(MockPaymentProviderAdapter.name);
  private readonly store = new Map<string, PaymentStatus>();

  constructor(@Inject(ID_GENERATOR) private readonly idGen: IIdGenerator) {}

  createPayment(input: {
    amount: Money;
    description: string;
    idempotencyKey: string;
  }): Promise<{ paymentRef: PaymentRef; redirectUrl: string | null }> {
    const paymentRef = PaymentRef.from(`mock_${this.idGen.generate()}`);

    this.store.set(paymentRef, 'SUCCEEDED');
    this.logger.log(
      `PAYMENT: amount=${String(input.amount.cents)} paymentRef=${paymentRef as string}`,
    );

    return Promise.resolve({ paymentRef, redirectUrl: null });
  }

  checkStatus(
    paymentRef: PaymentRef,
  ): Promise<{ status: PaymentStatus; provider: PaymentProvider }> {
    const ref = paymentRef as string;

    if (ref.startsWith('mock_fail_')) {
      return Promise.resolve({ status: 'FAILED', provider: 'mock' });
    }

    const stored = this.store.get(ref);

    return Promise.resolve({ status: stored ?? 'SUCCEEDED', provider: 'mock' });
  }
}
