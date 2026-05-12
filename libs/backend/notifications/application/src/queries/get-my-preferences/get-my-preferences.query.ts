import type { UserId } from '@det/shared-types';

export class GetMyPreferencesQuery {
  constructor(public readonly userId: UserId) {}
}
