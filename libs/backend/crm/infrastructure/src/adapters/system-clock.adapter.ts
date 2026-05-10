import { Injectable } from '@nestjs/common';

import { DateTime } from '@det/backend-shared-ddd';
import type { IClock } from '@det/backend-shared-ddd';

@Injectable()
export class SystemClockAdapter implements IClock {
  now(): DateTime {
    return DateTime.now();
  }
}
