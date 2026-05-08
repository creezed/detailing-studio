import { DomainEvent } from '@det/backend/shared/ddd';
import type { DateTime } from '@det/backend/shared/ddd';

import type { ServiceCategoryId } from './service-category-id';

const CATEGORY_AGGREGATE_TYPE = 'ServiceCategory';

function categoryEventProps(
  categoryId: ServiceCategoryId,
  eventType: string,
  occurredAt: DateTime,
) {
  return {
    aggregateId: categoryId,
    aggregateType: CATEGORY_AGGREGATE_TYPE,
    eventId: `${eventType}:${categoryId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class ServiceCategoryCreated extends DomainEvent {
  readonly eventType = 'ServiceCategoryCreated';

  constructor(
    public readonly categoryId: ServiceCategoryId,
    public readonly name: string,
    public readonly createdAt: DateTime,
  ) {
    super(categoryEventProps(categoryId, 'ServiceCategoryCreated', createdAt));
  }
}

export class ServiceCategoryDeactivated extends DomainEvent {
  readonly eventType = 'ServiceCategoryDeactivated';

  constructor(
    public readonly categoryId: ServiceCategoryId,
    public readonly deactivatedAt: DateTime,
  ) {
    super(categoryEventProps(categoryId, 'ServiceCategoryDeactivated', deactivatedAt));
  }
}
