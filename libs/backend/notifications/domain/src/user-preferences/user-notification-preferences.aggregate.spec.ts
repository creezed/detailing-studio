import { DateTime } from '@det/backend-shared-ddd';
import { UserId } from '@det/shared-types';

import { UserNotificationPreferences } from './user-notification-preferences.aggregate';
import { CriticalTemplateCannotBeFullyDisabledError } from './user-notification-preferences.errors';
import { UserNotificationPreferencesUpdated } from './user-notification-preferences.events';
import { NotificationChannel } from '../value-objects/notification-channel';
import { IanaTz, QuietHours } from '../value-objects/quiet-hours.value-object';

import type { TemplateCode } from '../value-objects/template-code';

const USER_ID = UserId.from('00000000-0000-1000-8000-000000000001');
const NOW = DateTime.from('2024-06-15T12:00:00Z');
const LATER = DateTime.from('2024-06-15T13:00:00Z');

const CONFIRMED: TemplateCode = 'APPOINTMENT_CONFIRMED';
const CANCELLED: TemplateCode = 'APPOINTMENT_CANCELLED';
const REMINDER: TemplateCode = 'APPOINTMENT_REMINDER';

function makeDefaults(): Map<TemplateCode, NotificationChannel[]> {
  return new Map<TemplateCode, NotificationChannel[]>([
    [CONFIRMED, [NotificationChannel.EMAIL, NotificationChannel.SMS]],
    [CANCELLED, [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH]],
    [REMINDER, [NotificationChannel.SMS]],
  ]);
}

describe('UserNotificationPreferences', () => {
  describe('createDefault', () => {
    it('creates with correct default channels', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      expect(prefs.id).toBe(USER_ID);
      expect(prefs.userId).toBe(USER_ID);
      expect(prefs.quietHours).toBeNull();

      const resolved = prefs.resolveChannelsFor(CONFIRMED, false);

      expect(resolved).toEqual([NotificationChannel.EMAIL, NotificationChannel.SMS]);
    });
  });

  describe('setChannelsForTemplate', () => {
    it('allows empty channels for non-critical template', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.setChannelsForTemplate(CONFIRMED, [], false, LATER);

      expect(prefs.resolveChannelsFor(CONFIRMED, false)).toEqual([]);
    });

    it('throws CriticalTemplateCannotBeFullyDisabledError for critical template with empty channels', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      expect(() => {
        prefs.setChannelsForTemplate(CANCELLED, [], true, LATER);
      }).toThrow(CriticalTemplateCannotBeFullyDisabledError);
    });

    it('allows reducing critical template channels to one', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.setChannelsForTemplate(CANCELLED, [NotificationChannel.PUSH], true, LATER);

      expect(prefs.resolveChannelsFor(CANCELLED, true)).toEqual([NotificationChannel.PUSH]);
    });

    it('emits UserNotificationPreferencesUpdated event', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.setChannelsForTemplate(CONFIRMED, [NotificationChannel.EMAIL], false, LATER);

      const events = prefs.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserNotificationPreferencesUpdated);
    });
  });

  describe('setQuietHours', () => {
    it('sets quiet hours', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      const qh = QuietHours.create({
        startMinuteOfDay: 22 * 60,
        endMinuteOfDay: 8 * 60,
        timezone: IanaTz.from('Europe/Moscow'),
      });

      prefs.setQuietHours(qh, LATER);

      expect(prefs.quietHours).toBe(qh);
    });

    it('clears quiet hours with null', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      const qh = QuietHours.create({
        startMinuteOfDay: 22 * 60,
        endMinuteOfDay: 8 * 60,
        timezone: IanaTz.from('UTC'),
      });

      prefs.setQuietHours(qh, LATER);
      prefs.setQuietHours(null, LATER);

      expect(prefs.quietHours).toBeNull();
    });
  });

  describe('resolveChannelsFor', () => {
    it('returns channelsByTemplate minus unsubscribedChannels', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.unsubscribeChannelGlobally(NotificationChannel.SMS, LATER);

      const resolved = prefs.resolveChannelsFor(CONFIRMED, false);

      expect(resolved).toEqual([NotificationChannel.EMAIL]);
    });

    it('does NOT apply unsubscribedChannels for critical templates', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.unsubscribeChannelGlobally(NotificationChannel.SMS, LATER);

      const resolved = prefs.resolveChannelsFor(CANCELLED, true);

      expect(resolved).toEqual([
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
        NotificationChannel.PUSH,
      ]);
    });

    it('returns empty array for unknown template code', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      const resolved = prefs.resolveChannelsFor('LOW_STOCK', false);

      expect(resolved).toEqual([]);
    });
  });

  describe('unsubscribe / resubscribe', () => {
    it('unsubscribeChannelGlobally adds to unsubscribed set', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.unsubscribeChannelGlobally(NotificationChannel.EMAIL, LATER);

      expect(prefs.resolveChannelsFor(CONFIRMED, false)).toEqual([NotificationChannel.SMS]);
    });

    it('resubscribeChannel removes from unsubscribed set', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.unsubscribeChannelGlobally(NotificationChannel.EMAIL, LATER);
      prefs.pullDomainEvents();
      prefs.resubscribeChannel(NotificationChannel.EMAIL, LATER);

      expect(prefs.resolveChannelsFor(CONFIRMED, false)).toEqual([
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
      ]);
    });

    it('resubscribeChannel is idempotent if channel not unsubscribed', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.resubscribeChannel(NotificationChannel.TELEGRAM, LATER);

      const events = prefs.pullDomainEvents();

      expect(events).toHaveLength(0);
    });
  });

  describe('snapshot / restore', () => {
    it('roundtrips via toSnapshot / restore', () => {
      const prefs = UserNotificationPreferences.createDefault({
        userId: USER_ID,
        defaults: makeDefaults(),
        now: NOW,
      });

      prefs.setQuietHours(
        QuietHours.create({
          startMinuteOfDay: 22 * 60,
          endMinuteOfDay: 8 * 60,
          timezone: IanaTz.from('Europe/Moscow'),
        }),
        LATER,
      );
      prefs.unsubscribeChannelGlobally(NotificationChannel.TELEGRAM, LATER);

      const snapshot = prefs.toSnapshot();
      const restored = UserNotificationPreferences.restore(snapshot);
      const restoredSnapshot = restored.toSnapshot();

      expect(restoredSnapshot).toEqual(snapshot);
    });
  });
});
