import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import type { ITenantContextPort } from '@det/backend-billing-application';
import {
  GenerateMonthlyInvoiceCommand,
  SUBSCRIPTION_REPOSITORY,
  TENANT_CONTEXT,
  CLOCK,
} from '@det/backend-billing-application';
import type { ISubscriptionRepository } from '@det/backend-billing-domain';
import { SubscriptionStatus } from '@det/backend-billing-domain';
import type { IClock } from '@det/backend-shared-ddd';

const CATCH_UP_DELAY_MS = 5_000;

@Injectable()
export class CatchUpInvoicesCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatchUpInvoicesCron.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(TENANT_CONTEXT) private readonly tenants: ITenantContextPort,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subRepo: ISubscriptionRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  onApplicationBootstrap(): void {
    setTimeout(() => {
      void this.catchUp();
    }, CATCH_UP_DELAY_MS);
  }

  async catchUp(): Promise<void> {
    this.logger.log('Running catch-up invoice check');

    const tenantIds = await this.tenants.getAll();
    const now = this.clock.now();

    for (const tenantId of tenantIds) {
      try {
        const sub = await this.subRepo.findByTenantId(tenantId);

        if (!sub) {
          continue;
        }

        const snap = sub.toSnapshot();
        const isEligible =
          snap.status === SubscriptionStatus.ACTIVE || snap.status === SubscriptionStatus.PAST_DUE;

        if (isEligible && now.isAfter(snap.nextBillingAt)) {
          this.logger.log(`Catch-up: generating missed invoice for tenant ${tenantId as string}`);
          await this.commandBus.execute(new GenerateMonthlyInvoiceCommand(tenantId));
        }
      } catch (e: unknown) {
        this.logger.error(
          { err: e instanceof Error ? e.message : String(e), tenantId },
          'Catch-up invoice failed',
        );
      }
    }

    this.logger.log('Catch-up invoice check completed');
  }
}
