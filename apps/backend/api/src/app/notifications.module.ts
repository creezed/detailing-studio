import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  NotificationsApplicationModule,
  ROLE_ROSTER_PORT,
  UNSUBSCRIBE_SECRET,
  USER_CONTACT_PORT,
} from '@det/backend-notifications-application';
import { NotificationsPersistenceModule } from '@det/backend-notifications-infrastructure';

import { NotificationRoleRosterPortAdapter } from '../acl/notification-role-roster-port.adapter';
import { NotificationUserContactPortAdapter } from '../acl/notification-user-contact-port.adapter';

const ACL_PROVIDERS: Provider[] = [
  NotificationRoleRosterPortAdapter,
  NotificationUserContactPortAdapter,
  {
    provide: ROLE_ROSTER_PORT,
    useExisting: NotificationRoleRosterPortAdapter,
  },
  {
    provide: USER_CONTACT_PORT,
    useExisting: NotificationUserContactPortAdapter,
  },
  {
    provide: UNSUBSCRIBE_SECRET,
    useFactory: (config: ConfigService): string =>
      config.get<string>('UNSUBSCRIBE_SECRET', 'default-unsubscribe-secret-change-me'),
    inject: [ConfigService],
  },
];

@Module({
  imports: [
    NotificationsApplicationModule.register(ACL_PROVIDERS, [
      NotificationsPersistenceModule.register(),
    ]),
  ],
})
export class ApiNotificationsModule {}
