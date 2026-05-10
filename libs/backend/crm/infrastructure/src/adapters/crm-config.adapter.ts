import { Injectable } from '@nestjs/common';

import type { ICrmConfigPort } from '@det/backend-crm-application';

@Injectable()
export class CrmConfigAdapter implements ICrmConfigPort {
  getCurrentPolicyVersion(): string {
    return '1.0.0';
  }
}
