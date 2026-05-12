import { DateTime } from '@det/backend-shared-ddd';

import { NotificationTemplate } from './notification-template.aggregate';
import {
  EmptyDefaultChannelsError,
  EmptyTemplateTitleError,
  TemplateBodyMissingForChannelError,
} from './notification-template.errors';
import { NotificationTemplateUpdated } from './notification-template.events';
import { NotificationChannel } from '../value-objects/notification-channel';

const NOW = DateTime.from('2024-06-15T12:00:00Z');
const LATER = DateTime.from('2024-06-15T13:00:00Z');

function validProps() {
  return {
    code: 'APPOINTMENT_CONFIRMED' as const,
    title: 'Запись подтверждена',
    bodyByChannel: {
      [NotificationChannel.EMAIL]: 'Email body {{name}}',
      [NotificationChannel.SMS]: 'SMS body {{name}}',
    },
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS] as const,
    isCritical: false,
    now: NOW,
  };
}

describe('NotificationTemplate', () => {
  describe('create', () => {
    it('creates with valid props', () => {
      const template = NotificationTemplate.create(validProps());

      expect(template.id).toBe('APPOINTMENT_CONFIRMED');
      expect(template.code).toBe('APPOINTMENT_CONFIRMED');
      expect(template.isCritical).toBe(false);
      expect(template.defaultChannels).toEqual([
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
      ]);
    });

    it('throws TemplateBodyMissingForChannelError when bodyByChannel does not cover defaultChannels', () => {
      expect(() => {
        NotificationTemplate.create({
          ...validProps(),
          bodyByChannel: {
            [NotificationChannel.EMAIL]: 'Email body',
          },
          defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
        });
      }).toThrow(TemplateBodyMissingForChannelError);
    });

    it('throws TemplateBodyMissingForChannelError when bodyByChannel has null for a default channel', () => {
      expect(() => {
        NotificationTemplate.create({
          ...validProps(),
          bodyByChannel: {
            [NotificationChannel.EMAIL]: 'Email body',
            [NotificationChannel.SMS]: null,
          },
          defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
        });
      }).toThrow(TemplateBodyMissingForChannelError);
    });

    it('throws EmptyDefaultChannelsError when defaultChannels is empty', () => {
      expect(() => {
        NotificationTemplate.create({
          ...validProps(),
          defaultChannels: [],
        });
      }).toThrow(EmptyDefaultChannelsError);
    });

    it('throws EmptyTemplateTitleError when title is empty', () => {
      expect(() => {
        NotificationTemplate.create({
          ...validProps(),
          title: '   ',
        });
      }).toThrow(EmptyTemplateTitleError);
    });

    it('creates critical template', () => {
      const template = NotificationTemplate.create({
        ...validProps(),
        code: 'APPOINTMENT_CANCELLED' as const,
        isCritical: true,
      });

      expect(template.isCritical).toBe(true);
    });
  });

  describe('update', () => {
    it('updates only passed fields', () => {
      const template = NotificationTemplate.create(validProps());

      template.update({
        title: 'Новый заголовок',
        now: LATER,
      });

      const snapshot = template.toSnapshot();

      expect(snapshot.title).toBe('Новый заголовок');
      expect(snapshot.updatedAt).toBe(LATER.iso());
      expect(snapshot.bodyByChannel[NotificationChannel.EMAIL]).toBe('Email body {{name}}');
    });

    it('emits NotificationTemplateUpdated event', () => {
      const template = NotificationTemplate.create(validProps());

      template.update({ title: 'Обновлён', now: LATER });

      const events = template.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(NotificationTemplateUpdated);

      const event = events[0] as NotificationTemplateUpdated;

      expect(event.code).toBe('APPOINTMENT_CONFIRMED');
    });

    it('validates body covers defaults after bodyByChannel update', () => {
      const template = NotificationTemplate.create(validProps());

      expect(() => {
        template.update({
          bodyByChannel: { [NotificationChannel.EMAIL]: 'only email' },
          now: LATER,
        });
      }).toThrow(TemplateBodyMissingForChannelError);
    });

    it('validates body covers defaults after defaultChannels update', () => {
      const template = NotificationTemplate.create(validProps());

      expect(() => {
        template.update({
          defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.TELEGRAM],
          now: LATER,
        });
      }).toThrow(TemplateBodyMissingForChannelError);
    });

    it('throws EmptyTemplateTitleError on empty title update', () => {
      const template = NotificationTemplate.create(validProps());

      expect(() => {
        template.update({ title: '', now: LATER });
      }).toThrow(EmptyTemplateTitleError);
    });
  });

  describe('snapshot / restore', () => {
    it('roundtrips via toSnapshot / restore', () => {
      const original = NotificationTemplate.create(validProps());
      const snapshot = original.toSnapshot();
      const restored = NotificationTemplate.restore(snapshot);
      const restoredSnapshot = restored.toSnapshot();

      expect(restoredSnapshot).toEqual(snapshot);
    });
  });
});
