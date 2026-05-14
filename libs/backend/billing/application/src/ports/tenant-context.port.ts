import type { TenantId } from '@det/shared-types';

export const TENANT_CONTEXT = Symbol('TENANT_CONTEXT');

export interface ITenantContextPort {
  getCurrent(): TenantId;
  getAll(): Promise<readonly TenantId[]>;
}
