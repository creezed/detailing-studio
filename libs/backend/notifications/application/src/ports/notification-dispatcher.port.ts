import type { NotificationSnapshot } from '@det/backend-notifications-domain';

export type DispatchResult =
  | { readonly ok: true; readonly providerId: string }
  | { readonly ok: false; readonly error: string; readonly retryable: boolean };

export interface INotificationDispatcherPort {
  dispatch(notification: NotificationSnapshot): Promise<DispatchResult>;
}

export const NOTIFICATION_DISPATCHER = Symbol('NOTIFICATION_DISPATCHER');
