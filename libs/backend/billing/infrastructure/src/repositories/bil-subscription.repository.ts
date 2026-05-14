import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  ISubscriptionRepository,
  Subscription,
  SubscriptionStatus,
} from '@det/backend-billing-domain';
import { OutboxService } from '@det/backend-shared-outbox';
import type { SubscriptionId, TenantId } from '@det/shared-types';

import {
  mapSubscriptionToDomain,
  mapSubscriptionToPersistence,
} from '../mappers/subscription.mapper';
import { BilSubscriptionSchema } from '../persistence/bil-subscription.schema';

@Injectable()
export class BilSubscriptionRepository implements ISubscriptionRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: SubscriptionId): Promise<Subscription | null> {
    const schema = await this.em.findOne(BilSubscriptionSchema, { id });

    return schema ? mapSubscriptionToDomain(schema) : null;
  }

  async findByTenantId(tenantId: TenantId): Promise<Subscription | null> {
    const schema = await this.em.findOne(BilSubscriptionSchema, {
      tenantId,
    });

    return schema ? mapSubscriptionToDomain(schema) : null;
  }

  async findAllByStatus(
    status: SubscriptionStatus,
    limit: number,
  ): Promise<readonly Subscription[]> {
    const schemas = await this.em.find(BilSubscriptionSchema, { status }, { limit });

    return schemas.map(mapSubscriptionToDomain);
  }

  async save(subscription: Subscription): Promise<void> {
    const existing = await this.em.findOne(BilSubscriptionSchema, {
      id: subscription.id,
    });
    const persisted = mapSubscriptionToPersistence(subscription, existing);

    const events = subscription.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
