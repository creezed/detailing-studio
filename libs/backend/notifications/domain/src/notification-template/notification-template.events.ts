import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { TemplateCode } from '../value-objects/template-code';

const AGGREGATE_TYPE = 'NotificationTemplate';

function eventProps(code: TemplateCode, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: code,
    aggregateType: AGGREGATE_TYPE,
    eventId: `${eventType}:${code}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class NotificationTemplateUpdated extends DomainEvent {
  readonly eventType = 'NotificationTemplateUpdated';

  constructor(
    public readonly code: TemplateCode,
    public readonly updatedAt: DateTime,
  ) {
    super(eventProps(code, 'NotificationTemplateUpdated', updatedAt));
  }
}
