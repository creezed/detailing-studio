import {
  NotificationChannel,
  NotificationStatus,
  NotificationTemplate,
  TemplatePayload,
  UserNotificationPreferences,
} from '@det/backend-notifications-domain';
import type {
  INotificationRepository,
  INotificationTemplateRepository,
  IUserNotificationPreferencesRepository,
  RecipientRef,
  Notification,
} from '@det/backend-notifications-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

import { IssueNotificationCommand } from './issue-notification.command';
import { IssueNotificationHandler } from './issue-notification.handler';
import { TemplateNotFoundError } from '../../errors/application.errors';

import type { IUserContactPort } from '../../ports/user-contact.port';

const NOW = DateTime.from('2024-06-15T12:00:00Z');
const USER_ID = 'u-1' as UserId;

let idCounter = 0;

function fakeIdGen(): IIdGenerator {
  return {
    generate: () => {
      idCounter += 1;
      return `00000000-0000-1000-8000-${String(idCounter).padStart(12, '0')}`;
    },
  };
}

function fakeClock(): IClock {
  return { now: () => NOW };
}

function createTemplate(
  code: string,
  channels: NotificationChannel[],
  isCritical = false,
): NotificationTemplate {
  return NotificationTemplate.create({
    bodyByChannel: Object.fromEntries(channels.map((ch) => [ch, `body-${ch}`])),
    code: code as never,
    defaultChannels: channels,
    isCritical,
    now: NOW,
    title: `Template ${code}`,
  });
}

function createPrefs(userId: UserId, template: NotificationTemplate): UserNotificationPreferences {
  return UserNotificationPreferences.createDefault({
    defaults: new Map([[template.code, [...template.defaultChannels]]]),
    now: NOW,
    userId,
  });
}

describe('IssueNotificationHandler', () => {
  let handler: IssueNotificationHandler;
  let notifRepo: INotificationRepository;
  let templateRepo: INotificationTemplateRepository;
  let prefsRepo: IUserNotificationPreferencesRepository;
  let userContactPort: IUserContactPort;
  let savedNotifications: Notification[];

  beforeEach(() => {
    idCounter = 0;
    savedNotifications = [];

    const templates = new Map<string, NotificationTemplate>();

    templateRepo = {
      findByCode: jest.fn((code: string) => Promise.resolve(templates.get(code) ?? null)),
      findAll: jest.fn(() => Promise.resolve([...templates.values()])),
      save: jest.fn((t: NotificationTemplate) => {
        templates.set(t.code, t);

        return Promise.resolve();
      }),
    };

    const prefsMap = new Map<string, UserNotificationPreferences>();

    prefsRepo = {
      findByUserId: jest.fn((id: string) => Promise.resolve(prefsMap.get(id) ?? null)),
      save: jest.fn((p: UserNotificationPreferences) => {
        prefsMap.set(p.userId, p);

        return Promise.resolve();
      }),
    };

    notifRepo = {
      findById: jest.fn().mockResolvedValue(null),
      findByDedupKey: jest.fn().mockResolvedValue([]),
      findScheduledBefore: jest.fn().mockResolvedValue([]),
      save: jest.fn((n: Notification) => {
        savedNotifications.push(n);

        return Promise.resolve();
      }),
    };

    userContactPort = {
      getContactRefsFor: jest.fn(
        (userId: UserId, channel: NotificationChannel): Promise<RecipientRef[]> => {
          if (channel === NotificationChannel.EMAIL) {
            return Promise.resolve([{ kind: 'email', email: `${userId}@test.com` }]);
          }

          if (channel === NotificationChannel.SMS) {
            return Promise.resolve([{ kind: 'phone', phone: '+79001234567' }]);
          }

          return Promise.resolve([]);
        },
      ),
    };

    handler = new IssueNotificationHandler(
      templateRepo,
      prefsRepo,
      notifRepo,
      userContactPort,
      fakeClock(),
      fakeIdGen(),
    );
  });

  it('issues notifications for user with EMAIL+SMS channels', async () => {
    const tpl = createTemplate('USER_REGISTERED', [
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ]);

    await templateRepo.save(tpl);

    const prefs = createPrefs(USER_ID, tpl);

    await prefsRepo.save(prefs);

    const result = await handler.execute(
      new IssueNotificationCommand(
        { kind: 'user', userId: USER_ID },
        'USER_REGISTERED',
        TemplatePayload.from({ fullName: 'Test' }),
      ),
    );

    expect(result.notificationIds).toHaveLength(2);
    expect(result.deduped.every((d) => !d)).toBe(true);
    expect(savedNotifications).toHaveLength(2);
  });

  it('user unsubscribed from EMAIL (non-critical) → only SMS', async () => {
    const tpl = createTemplate('USER_REGISTERED', [
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ]);

    await templateRepo.save(tpl);

    const prefs = createPrefs(USER_ID, tpl);

    prefs.unsubscribeChannelGlobally(NotificationChannel.EMAIL, NOW);
    await prefsRepo.save(prefs);

    const result = await handler.execute(
      new IssueNotificationCommand(
        { kind: 'user', userId: USER_ID },
        'USER_REGISTERED',
        TemplatePayload.from({ fullName: 'Test' }),
      ),
    );

    expect(result.notificationIds).toHaveLength(1);
    expect(savedNotifications).toHaveLength(1);
  });

  it('user unsubscribed from EMAIL (critical APPOINTMENT_CANCELLED) → EMAIL still sent', async () => {
    const tpl = createTemplate('APPOINTMENT_CANCELLED', [NotificationChannel.EMAIL], true);

    await templateRepo.save(tpl);

    const prefs = createPrefs(USER_ID, tpl);

    prefs.unsubscribeChannelGlobally(NotificationChannel.EMAIL, NOW);
    await prefsRepo.save(prefs);

    const result = await handler.execute(
      new IssueNotificationCommand(
        { kind: 'user', userId: USER_ID },
        'APPOINTMENT_CANCELLED',
        TemplatePayload.from({ reason: 'test' }),
      ),
    );

    expect(result.notificationIds).toHaveLength(1);
    expect(savedNotifications).toHaveLength(1);
  });

  it('dedup: second LOW_STOCK for same SKU+branch → DEDUPED', async () => {
    const tpl = createTemplate('LOW_STOCK', [NotificationChannel.EMAIL]);

    await templateRepo.save(tpl);

    const prefs = createPrefs(USER_ID, tpl);

    await prefsRepo.save(prefs);

    const payload = TemplatePayload.from({ skuId: 'sku-1', branchId: 'b-1' });

    const first = await handler.execute(
      new IssueNotificationCommand({ kind: 'user', userId: USER_ID }, 'LOW_STOCK', payload),
    );

    expect(first.deduped[0]).toBe(false);

    (notifRepo.findByDedupKey as jest.Mock).mockResolvedValue(savedNotifications.slice());

    const second = await handler.execute(
      new IssueNotificationCommand({ kind: 'user', userId: USER_ID }, 'LOW_STOCK', payload),
    );

    expect(second.deduped[0]).toBe(true);
    expect(savedNotifications[1]?.status).toBe(NotificationStatus.DEDUPED);
  });

  it('guest phone → only SMS', async () => {
    const tpl = createTemplate('APPOINTMENT_CONFIRMED', [
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ]);

    await templateRepo.save(tpl);

    const result = await handler.execute(
      new IssueNotificationCommand(
        { kind: 'phone', phone: '+79001234567' },
        'APPOINTMENT_CONFIRMED',
        TemplatePayload.from({ datetime: '2024-06-20T10:00:00Z' }),
      ),
    );

    expect(result.notificationIds).toHaveLength(1);
    expect(savedNotifications).toHaveLength(1);
  });

  it('throws TemplateNotFoundError for missing template', async () => {
    await expect(
      handler.execute(
        new IssueNotificationCommand(
          { kind: 'user', userId: USER_ID },
          'USER_REGISTERED',
          TemplatePayload.from({}),
        ),
      ),
    ).rejects.toThrow(TemplateNotFoundError);
  });

  it('creates default preferences when none exist', async () => {
    const tpl = createTemplate('USER_REGISTERED', [NotificationChannel.EMAIL]);

    await templateRepo.save(tpl);

    await handler.execute(
      new IssueNotificationCommand(
        { kind: 'user', userId: USER_ID },
        'USER_REGISTERED',
        TemplatePayload.from({ fullName: 'Test' }),
      ),
    );

    expect(prefsRepo.save).toHaveBeenCalled(); // eslint-disable-line @typescript-eslint/unbound-method
    expect(savedNotifications).toHaveLength(1);
  });
});
