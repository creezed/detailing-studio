import type { UserId } from '@det/shared-types';

import { ListMyNotificationsHandler } from './list-my-notifications.handler';
import { ListMyNotificationsQuery } from './list-my-notifications.query';

import type { INotificationReadPort } from '../../ports/notification-read.port';
import type {
  CursorPaginatedResult,
  MyNotificationDto,
} from '../../read-models/notification.read-models';

const USER_ID = 'u-1' as UserId;

function makeDto(id: string, createdAt: string): MyNotificationDto {
  return {
    id,
    templateCode: 'USER_REGISTERED',
    channel: 'EMAIL',
    status: 'SENT',
    createdAt,
    sentAt: createdAt,
    renderedPreview: 'Hello...',
  };
}

describe('ListMyNotificationsHandler', () => {
  let handler: ListMyNotificationsHandler;
  let readPort: INotificationReadPort;

  beforeEach(() => {
    readPort = {
      listMy: jest.fn().mockResolvedValue({
        items: [makeDto('n-1', '2024-06-15T12:00:00Z'), makeDto('n-2', '2024-06-14T10:00:00Z')],
        nextCursor: 'n-2|2024-06-14T10:00:00Z',
      } satisfies CursorPaginatedResult<MyNotificationDto>),
      listAdmin: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listFailed: jest.fn().mockResolvedValue([]),
      getById: jest.fn().mockResolvedValue(null),
    };

    handler = new ListMyNotificationsHandler(readPort);
  });

  it('delegates to readPort.listMy with filters', async () => {
    const query = new ListMyNotificationsQuery(USER_ID, 'SENT', 'USER_REGISTERED');
    const result = await handler.execute(query);

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('n-2|2024-06-14T10:00:00Z');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(readPort.listMy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        status: 'SENT',
        templateCode: 'USER_REGISTERED',
        limit: 20,
      }),
    );
  });

  it('uses default limit 20', async () => {
    const query = new ListMyNotificationsQuery(USER_ID);
    await handler.execute(query);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(readPort.listMy).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
  });

  it('passes cursor for pagination', async () => {
    const query = new ListMyNotificationsQuery(
      USER_ID,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'cursor-abc',
      10,
    );
    await handler.execute(query);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(readPort.listMy).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: 'cursor-abc', limit: 10 }),
    );
  });
});
