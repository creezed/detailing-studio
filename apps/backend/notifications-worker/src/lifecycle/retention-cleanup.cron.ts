import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

const RETENTION_DAYS = '90';

@Injectable()
export class RetentionCleanupCron {
  private readonly logger = new Logger(RetentionCleanupCron.name);

  constructor(private readonly em: EntityManager) {}

  @Cron('0 3 * * *')
  async handleRetentionCleanup(): Promise<void> {
    const knex = this.em.getKnex();
    const result: { rowCount?: number } = await knex.raw(
      `DELETE FROM ntf_notification
       WHERE status IN ('SENT', 'FAILED', 'DEDUPED', 'EXPIRED')
         AND created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`,
    );

    const count = result.rowCount ?? 0;

    if (count > 0) {
      this.logger.log(`Deleted ${String(count)} old notifications (retention ${RETENTION_DAYS}d)`);
    }
  }
}
