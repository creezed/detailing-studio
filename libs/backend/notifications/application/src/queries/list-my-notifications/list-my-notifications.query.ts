import type { UserId } from '@det/shared-types';

export class ListMyNotificationsQuery {
  constructor(
    public readonly userId: UserId,
    public readonly status?: string,
    public readonly templateCode?: string,
    public readonly channel?: string,
    public readonly dateFrom?: string,
    public readonly dateTo?: string,
    public readonly cursor?: string,
    public readonly limit: number = 20,
  ) {}
}
