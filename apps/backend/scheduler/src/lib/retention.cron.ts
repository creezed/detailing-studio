import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

const VOIDED_INVOICE_RETENTION_DAYS = 365;
const OUTBOX_RETENTION_DAYS = 7;

@Injectable()
export class RetentionCron {
  private readonly logger = new Logger(RetentionCron.name);

  constructor(private readonly em: EntityManager) {}

  @Cron('0 3 * * *')
  async handleRetention(): Promise<void> {
    await this.cleanVoidedInvoices();
    await this.cleanPublishedOutboxEvents();
  }

  private async cleanVoidedInvoices(): Promise<void> {
    const conn = this.em.getConnection();
    const result = await conn.execute(
      `DELETE FROM "bil_invoice"
       WHERE "status" = 'VOIDED'
         AND "issued_at" < NOW() - INTERVAL '${String(VOIDED_INVOICE_RETENTION_DAYS)} days'`,
    );

    const count = Array.isArray(result) ? result.length : 0;

    if (count > 0) {
      this.logger.log(
        `Deleted ${String(count)} voided invoices (retention ${String(VOIDED_INVOICE_RETENTION_DAYS)}d)`,
      );
    }
  }

  private async cleanPublishedOutboxEvents(): Promise<void> {
    const conn = this.em.getConnection();
    const result = await conn.execute(
      `DELETE FROM "outbox_events"
       WHERE "published_at" IS NOT NULL
         AND "published_at" < NOW() - INTERVAL '${String(OUTBOX_RETENTION_DAYS)} days'`,
    );

    const count = Array.isArray(result) ? result.length : 0;

    if (count > 0) {
      this.logger.log(
        `Deleted ${String(count)} published outbox events (retention ${String(OUTBOX_RETENTION_DAYS)}d)`,
      );
    }
  }
}
