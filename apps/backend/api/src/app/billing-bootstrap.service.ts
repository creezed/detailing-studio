import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';

import {
  StartTrialCommand,
  TenantAlreadyHasSubscriptionError,
} from '@det/backend-billing-application';
import type { TenantId } from '@det/shared-types';

@Injectable()
export class BillingBootstrapService implements OnApplicationBootstrap {
  private readonly _logger = new Logger(BillingBootstrapService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const tenantId = this.config.get<string>(
      'DEFAULT_TENANT_ID',
      '00000000-0000-4000-a000-000000000001',
    ) as TenantId;

    try {
      await this.commandBus.execute(new StartTrialCommand(tenantId));
      this._logger.log(`Created TRIAL subscription for tenant ${tenantId}`);
    } catch (err: unknown) {
      if (err instanceof TenantAlreadyHasSubscriptionError) {
        this._logger.debug(`Subscription already exists for tenant ${tenantId}`);

        return;
      }
      throw err;
    }
  }
}
