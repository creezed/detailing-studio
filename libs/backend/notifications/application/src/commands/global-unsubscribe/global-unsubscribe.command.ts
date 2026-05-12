import type { DateTime } from '@det/backend-shared-ddd';

export class GlobalUnsubscribeCommand {
  constructor(
    public readonly unsubscribeToken: string,
    public readonly now: DateTime,
  ) {}
}
