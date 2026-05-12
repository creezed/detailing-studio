import { CLOCK, ID_GENERATOR } from '@det/backend-shared-ddd';

import { NOTIFICATION_DISPATCHER } from '../ports/notification-dispatcher.port';
import { REMINDER_SCHEDULER } from '../ports/reminder-scheduler.port';
import { ROLE_ROSTER_PORT } from '../ports/role-roster.port';
import { TEMPLATE_RENDERER } from '../ports/template-renderer.port';
import { USER_CONTACT_PORT } from '../ports/user-contact.port';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
export const NOTIFICATION_TEMPLATE_REPOSITORY = Symbol('NOTIFICATION_TEMPLATE_REPOSITORY');
export const USER_NOTIFICATION_PREFERENCES_REPOSITORY = Symbol(
  'USER_NOTIFICATION_PREFERENCES_REPOSITORY',
);

export {
  CLOCK,
  ID_GENERATOR,
  NOTIFICATION_DISPATCHER,
  REMINDER_SCHEDULER,
  ROLE_ROSTER_PORT,
  TEMPLATE_RENDERER,
  USER_CONTACT_PORT,
};
