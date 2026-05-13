import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { IUserContactPort } from '@det/backend-notifications-application';
import { NotificationChannel } from '@det/backend-notifications-domain';
import type { RecipientRef } from '@det/backend-notifications-domain';
import type { UserId } from '@det/shared-types';

@Injectable()
export class NotificationUserContactPortAdapter implements IUserContactPort {
  constructor(private readonly em: EntityManager) {}

  async getContactRefsFor(userId: UserId, channel: NotificationChannel): Promise<RecipientRef[]> {
    const row = await this.em
      .getConnection()
      .execute<
        Array<{ email: string | null; phone: string | null }>
      >(`select email, phone from iam_user where id = $1 and status = 'ACTIVE' limit 1`, [userId]);

    const user = row[0];

    if (!user) {
      return [];
    }

    switch (channel) {
      case NotificationChannel.EMAIL:
        return user.email ? [{ kind: 'email' as const, email: user.email }] : [];
      case NotificationChannel.SMS:
        return user.phone ? [{ kind: 'phone' as const, phone: user.phone }] : [];
      case NotificationChannel.PUSH:
        return [{ kind: 'user' as const, userId }];
      case NotificationChannel.TELEGRAM:
        return [];
      default:
        return [];
    }
  }
}
