import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { IBillingConfigPort } from '@det/backend-billing-application';

@Injectable()
export class BillingConfigAdapter implements IBillingConfigPort {
  constructor(private readonly config: ConfigService) {}

  get demoBillingAutoPay(): boolean {
    return this.config.get<string>('DEMO_BILLING_AUTO_PAY', 'true') === 'true';
  }
}
