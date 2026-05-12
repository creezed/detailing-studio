export class ListNotificationsAdminQuery {
  constructor(
    public readonly status?: string,
    public readonly templateCode?: string,
    public readonly channel?: string,
    public readonly userId?: string,
    public readonly dateFrom?: string,
    public readonly dateTo?: string,
    public readonly cursor?: string,
    public readonly limit: number = 20,
  ) {}
}
