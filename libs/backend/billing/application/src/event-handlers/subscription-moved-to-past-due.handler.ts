import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { SubscriptionMovedToPastDue } from '@det/backend-billing-domain';

@Injectable()
@EventsHandler(SubscriptionMovedToPastDue)
export class SubscriptionMovedToPastDueHandler implements IEventHandler<SubscriptionMovedToPastDue> {
  private readonly logger = new Logger(SubscriptionMovedToPastDueHandler.name);

  handle(event: SubscriptionMovedToPastDue): void {
    this.logger.warn(`Subscription ${event.subscriptionId} moved to PAST_DUE`);
    // Phase 2: emit BillingPastDueDetected integration event via outbox
  }
}
