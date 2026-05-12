import { NotificationChannel } from '@det/backend-notifications-domain';
import type {
  INotificationTemplateRepository,
  NotificationTemplate,
} from '@det/backend-notifications-domain';
import type { UserId } from '@det/shared-types';

import { GetMyPreferencesHandler } from './get-my-preferences.handler';
import { GetMyPreferencesQuery } from './get-my-preferences.query';

import type { IPreferencesReadPort } from '../../ports/preferences-read.port';
import type { UserNotificationPreferencesDto } from '../../read-models/notification.read-models';

const USER_ID = 'u-1' as UserId;

function fakeTemplate(
  code: string,
  channels: NotificationChannel[],
): Pick<NotificationTemplate, 'code' | 'defaultChannels' | 'isCritical'> {
  return {
    code: code as NotificationTemplate['code'],
    defaultChannels: channels,
    isCritical: false,
  };
}

describe('GetMyPreferencesHandler', () => {
  let handler: GetMyPreferencesHandler;
  let prefsReadPort: jest.Mocked<IPreferencesReadPort>;
  let templateRepo: jest.Mocked<INotificationTemplateRepository>;

  beforeEach(() => {
    prefsReadPort = {
      getByUserId: jest.fn(),
    };

    templateRepo = {
      findByCode: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    };

    handler = new GetMyPreferencesHandler(prefsReadPort, templateRepo);
  });

  it('returns defaults when no preferences in DB (lazy)', async () => {
    prefsReadPort.getByUserId.mockResolvedValue(null);
    templateRepo.findAll.mockResolvedValue([
      fakeTemplate('USER_REGISTERED', [NotificationChannel.EMAIL]),
      fakeTemplate('LOW_STOCK', [NotificationChannel.TELEGRAM, NotificationChannel.EMAIL]),
    ] as NotificationTemplate[]);

    const result = await handler.execute(new GetMyPreferencesQuery(USER_ID));

    expect(result.channelsByTemplate).toEqual({
      USER_REGISTERED: [NotificationChannel.EMAIL],
      LOW_STOCK: [NotificationChannel.TELEGRAM, NotificationChannel.EMAIL],
    });
    expect(result.quietHours).toBeNull();
    expect(result.unsubscribedChannels).toEqual([]);
  });

  it('fills missing templates when prefs exist in DB', async () => {
    const existing: UserNotificationPreferencesDto = {
      channelsByTemplate: {
        USER_REGISTERED: [NotificationChannel.SMS],
      },
      quietHours: null,
      unsubscribedChannels: [],
    };
    prefsReadPort.getByUserId.mockResolvedValue(existing);
    templateRepo.findAll.mockResolvedValue([
      fakeTemplate('USER_REGISTERED', [NotificationChannel.EMAIL]),
      fakeTemplate('LOW_STOCK', [NotificationChannel.TELEGRAM]),
    ] as NotificationTemplate[]);

    const result = await handler.execute(new GetMyPreferencesQuery(USER_ID));

    expect(result.channelsByTemplate['USER_REGISTERED']).toEqual([NotificationChannel.SMS]);
    expect(result.channelsByTemplate['LOW_STOCK']).toEqual([NotificationChannel.TELEGRAM]);
  });

  it('does not save preferences (lazy default)', async () => {
    prefsReadPort.getByUserId.mockResolvedValue(null);
    templateRepo.findAll.mockResolvedValue([]);

    await handler.execute(new GetMyPreferencesQuery(USER_ID));

    expect(templateRepo.save).not.toHaveBeenCalled(); // eslint-disable-line @typescript-eslint/unbound-method
  });
});
