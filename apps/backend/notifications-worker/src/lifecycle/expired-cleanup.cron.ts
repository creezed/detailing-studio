import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

const BATCH_SIZE = 1000;

@Injectable()
export class ExpiredCleanupCron {
  private readonly logger = new Logger(ExpiredCleanupCron.name);

  constructor(private readonly em: EntityManager) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredNotifications(): Promise<void> {
    const knex = this.em.getKnex();
    const result: { rowCount?: number } = await knex.raw(
      `WITH expired AS (
         SELECT id FROM ntf_notification
         WHERE status IN ('PENDING', 'QUEUED')
           AND expires_at < NOW()
         LIMIT ?
       )
       UPDATE ntf_notification SET status = 'EXPIRED'
       FROM expired
       WHERE ntf_notification.id = expired.id`,
      [BATCH_SIZE],
    );

    const count = result.rowCount ?? 0;

    if (count > 0) {
      this.logger.log(`Marked ${String(count)} expired notifications`);
    }
  }
}
