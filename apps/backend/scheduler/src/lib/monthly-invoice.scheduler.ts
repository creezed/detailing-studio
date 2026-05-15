import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';

export const BILLING_SCHEDULER_QUEUE = 'billing-scheduler';

@Injectable()
export class MonthlyInvoiceScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(MonthlyInvoiceScheduler.name);

  constructor(@InjectQueue(BILLING_SCHEDULER_QUEUE) private readonly queue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      'monthly-invoice',
      {},
      {
        jobId: 'monthly-invoice-repeatable',
        removeOnComplete: 100,
        removeOnFail: 1000,
        repeat: { pattern: '0 0 1 * *', tz: 'UTC' },
      },
    );
    this.logger.log('Registered repeatable job: monthly-invoice (1st of month 00:00 UTC)');
  }
}
