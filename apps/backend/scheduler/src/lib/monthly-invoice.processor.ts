import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { GenerateMonthlyInvoiceCommand, TENANT_CONTEXT } from '@det/backend-billing-application';
import type { ITenantContextPort } from '@det/backend-billing-application';

import { BILLING_SCHEDULER_QUEUE } from './monthly-invoice.scheduler';

import type { Job } from 'bullmq';

@Processor(BILLING_SCHEDULER_QUEUE)
export class MonthlyInvoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(MonthlyInvoiceProcessor.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(TENANT_CONTEXT) private readonly tenants: ITenantContextPort,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'monthly-invoice') {
      return;
    }

    this.logger.log('Starting monthly invoice generation');

    const tenantIds = await this.tenants.getAll();

    for (const tenantId of tenantIds) {
      try {
        await this.commandBus.execute(new GenerateMonthlyInvoiceCommand(tenantId));
      } catch (e: unknown) {
        this.logger.error(
          { err: e instanceof Error ? e.message : String(e), tenantId },
          'Failed to generate monthly invoice',
        );
      }
    }

    this.logger.log(`Monthly invoice generation completed for ${String(tenantIds.length)} tenants`);
  }
}
