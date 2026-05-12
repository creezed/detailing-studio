import { ApplicationError } from '@det/backend-shared-ddd';

export class TemplateNotFoundError extends ApplicationError {
  readonly code = 'TEMPLATE_NOT_FOUND';
  readonly httpStatus = 500;

  constructor(public readonly templateCode: string) {
    super(`Notification template '${templateCode}' not found — must be seeded`);
  }
}

export class NotificationNotFoundError extends ApplicationError {
  readonly code = 'NOTIFICATION_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(public readonly notificationId: string) {
    super(`Notification ${notificationId} not found`);
  }
}

export class NotificationNotRetryableError extends ApplicationError {
  readonly code = 'NOTIFICATION_NOT_RETRYABLE';
  readonly httpStatus = 422;

  constructor(
    public readonly notificationId: string,
    public readonly currentStatus: string,
  ) {
    super(`Notification ${notificationId} is ${currentStatus}, not FAILED`);
  }
}

export class PushSubscriptionNotFoundError extends ApplicationError {
  readonly code = 'PUSH_SUBSCRIPTION_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(public readonly subscriptionId: string) {
    super(`Push subscription ${subscriptionId} not found`);
  }
}

export class InvalidUnsubscribeTokenError extends ApplicationError {
  readonly code = 'INVALID_UNSUBSCRIBE_TOKEN';
  readonly httpStatus = 400;

  constructor() {
    super('Invalid or expired unsubscribe token');
  }
}
