import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';

import type { ILimitsUsagePort } from '@det/backend-billing-application';
import type { LimitsUsage, Period } from '@det/backend-billing-domain';
import type { TenantId } from '@det/shared-types';

@Injectable()
export class LimitsUsageAdapter implements ILimitsUsagePort {
  private readonly logger = new Logger(LimitsUsageAdapter.name);

  constructor(private readonly em: EntityManager) {}

  async getUsage(tenantId: TenantId, period: Period): Promise<LimitsUsage> {
    const branchesUsed = await this.countSafe(
      `SELECT COUNT(*)::int FROM "iam_user"
       WHERE "role_set" @> '["OWNER"]'::jsonb
         AND "status" = 'ACTIVE'
         AND "id" IS NOT NULL`,
      [],
      'iam_user (branches approximation)',
    );

    const mastersUsed = await this.countSafe(
      `SELECT COUNT(*)::int FROM "iam_user"
       WHERE "role_set" @> '["MASTER"]'::jsonb
         AND "status" = 'ACTIVE'`,
      [],
      'iam_user (masters)',
    );

    const appointmentsThisMonthUsed = await this.countSafe(
      `SELECT COUNT(*)::int FROM "sch_appointment"
       WHERE "created_at" >= $1
         AND "created_at" < $2
         AND "status" != 'CANCELLED'`,
      [period.startedAt.toDate(), period.endsAt.toDate()],
      'sch_appointment',
    );

    return {
      appointmentsThisMonthUsed,
      branchesUsed,
      mastersUsed,
      periodEnd: period.endsAt,
      periodStart: period.startedAt,
    };
  }

  private async countSafe(sql: string, params: unknown[], tableHint: string): Promise<number> {
    try {
      const conn = this.em.getConnection();
      const result = await conn.execute<Array<{ count: number }>>(sql, params);

      return result[0]?.count ?? 0;
    } catch {
      this.logger.warn(`Table for ${tableHint} not available, returning 0`);

      return 0;
    }
  }
}
