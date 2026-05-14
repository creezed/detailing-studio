import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import type { ISubscriptionRepository } from '@det/backend-billing-domain';
import { Plan } from '@det/backend-billing-domain';

import {
  GetCurrentSubscriptionQuery,
  type SubscriptionDto,
} from './get-current-subscription.query';
import { SUBSCRIPTION_REPOSITORY } from '../../di/tokens';
import { SubscriptionNotFoundError } from '../../errors/application.errors';

@QueryHandler(GetCurrentSubscriptionQuery)
export class GetCurrentSubscriptionHandler implements IQueryHandler<
  GetCurrentSubscriptionQuery,
  SubscriptionDto
> {
  constructor(@Inject(SUBSCRIPTION_REPOSITORY) private readonly repo: ISubscriptionRepository) {}

  async execute(q: GetCurrentSubscriptionQuery): Promise<SubscriptionDto> {
    const sub = await this.repo.findByTenantId(q.tenantId);

    if (!sub) {
      throw new SubscriptionNotFoundError(q.tenantId);
    }

    const snap = sub.toSnapshot();
    const plan = Plan.byCode(snap.planCode);

    return {
      id: snap.id,
      planCode: snap.planCode,
      planName: plan.name,
      planPriceCents: Number(plan.pricePerMonth.cents),
      status: snap.status,
      currentPeriodStartedAt: snap.currentPeriodStartedAt.iso(),
      nextBillingAt: snap.nextBillingAt.iso(),
      trialEndsAt: snap.trialEndsAt?.iso() ?? null,
      cancelledAt: snap.cancelledAt?.iso() ?? null,
    };
  }
}
