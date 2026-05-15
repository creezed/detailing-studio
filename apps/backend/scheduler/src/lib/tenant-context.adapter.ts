import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ITenantContextPort } from '@det/backend-billing-application';
import { TenantId } from '@det/shared-types';

@Injectable()
export class TenantContextAdapter implements ITenantContextPort {
  private readonly defaultTenantId: TenantId;

  constructor(config: ConfigService) {
    this.defaultTenantId = TenantId.from(
      config.get<string>('DEFAULT_TENANT_ID', '00000000-0000-4000-a000-000000000001'),
    );
  }

  getCurrent(): TenantId {
    return this.defaultTenantId;
  }

  getAll(): Promise<readonly TenantId[]> {
    return Promise.resolve([this.defaultTenantId]);
  }
}
