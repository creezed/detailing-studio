import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import type { ISubscriptionRepository } from '@det/backend-billing-domain';
import { Period, evaluateLimits } from '@det/backend-billing-domain';
import type { IClock } from '@det/backend-shared-ddd';
import { DateTime } from '@det/backend-shared-ddd';

import {
  GetTariffLimitsUsageQuery,
  type LimitsUsageReportDto,
} from './get-tariff-limits-usage.query';
import { CLOCK, LIMITS_USAGE_PORT, SUBSCRIPTION_REPOSITORY } from '../../di/tokens';
import { SubscriptionNotFoundError } from '../../errors/application.errors';

import type { ILimitsUsagePort } from '../../ports/limits-usage.port';

@QueryHandler(GetTariffLimitsUsageQuery)
export class GetTariffLimitsUsageHandler implements IQueryHandler<
  GetTariffLimitsUsageQuery,
  LimitsUsageReportDto
> {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subRepo: ISubscriptionRepository,
    @Inject(LIMITS_USAGE_PORT) private readonly limitsUsagePort: ILimitsUsagePort,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(q: GetTariffLimitsUsageQuery): Promise<LimitsUsageReportDto> {
    const sub = await this.subRepo.findByTenantId(q.tenantId);

    if (!sub) {
      throw new SubscriptionNotFoundError(q.tenantId);
    }

    const snap = sub.toSnapshot();
    const now = this.clock.now();
    const monthStart = DateTime.from(
      new Date(Date.UTC(now.toDate().getUTCFullYear(), now.toDate().getUTCMonth(), 1)),
    );
    const monthEnd = monthStart.plusMonths(1);
    const period = new Period(monthStart, monthEnd);

    const usage = await this.limitsUsagePort.getUsage(q.tenantId, period);

    return evaluateLimits(snap.planCode, usage);
  }
}
