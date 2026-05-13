import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { IRoleRosterPort } from '@det/backend-notifications-application';
import type { BranchId, UserId } from '@det/shared-types';

@Injectable()
export class NotificationRoleRosterPortAdapter implements IRoleRosterPort {
  constructor(private readonly em: EntityManager) {}

  async getUserIdsByRoleAndBranch(
    role: 'OWNER' | 'MANAGER',
    branchId: BranchId,
  ): Promise<UserId[]> {
    const rows = await this.em.getConnection().execute<Array<{ id: string }>>(
      `select id from iam_user
       where status = 'ACTIVE'
         and role_set @> $1::jsonb
         and branch_ids @> $2::jsonb`,
      [JSON.stringify([role]), JSON.stringify([branchId])],
    );

    return rows.map((r) => r.id as UserId);
  }

  async getOwnerUserIds(): Promise<UserId[]> {
    const rows = await this.em.getConnection().execute<Array<{ id: string }>>(
      `select id from iam_user
       where status = 'ACTIVE'
         and role_set @> '["OWNER"]'::jsonb`,
    );

    return rows.map((r) => r.id as UserId);
  }
}
