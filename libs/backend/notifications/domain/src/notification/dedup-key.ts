import type { DateTime } from '@det/backend-shared-ddd';

import type { TemplateCode } from '../value-objects/template-code';

export interface DedupKey {
  readonly templateCode: TemplateCode;
  readonly scopeKey: string;
  readonly windowEndsAt: DateTime;
}

export interface DedupKeySnapshot {
  readonly templateCode: string;
  readonly scopeKey: string;
  readonly windowEndsAt: string;
}
