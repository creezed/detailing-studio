import type { NotificationChannel, RecipientRef } from '@det/backend-notifications-domain';
import type { UserId } from '@det/shared-types';

export interface IUserContactPort {
  getContactRefsFor(userId: UserId, channel: NotificationChannel): Promise<RecipientRef[]>;
}

export const USER_CONTACT_PORT = Symbol('USER_CONTACT_PORT');
