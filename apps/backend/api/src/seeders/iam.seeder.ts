import { Seeder } from '@mikro-orm/seeder';

import { Role, UserStatus } from '@det/backend/iam/domain';
import { IamUserSchema } from '@det/backend/iam/infrastructure';

import { BRANCH_IDS } from './data/catalog.data';
import { IamUserFactory } from './factories/iam-user.factory';
import { seederLog } from './helpers/seeder-logger';

import type { EntityManager } from '@mikro-orm/core';

const LABEL = 'IAM Seeder';
const OWNER_EMAIL = 'owner@studio.local';

function branchForIndex(index: number): string {
  return index % 2 === 0 ? BRANCH_IDS.MAIN : BRANCH_IDS.SOUTH;
}

export class IamSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const ownerExists = await em.count(IamUserSchema, { email: OWNER_EMAIL });

    if (ownerExists > 0) {
      seederLog(LABEL, 'Owner already exists — skipping');

      return;
    }

    seederLog(LABEL, 'Seeding IAM users...');

    const now = new Date();
    const factory = new IamUserFactory(em);

    em.create(IamUserSchema, {
      branchIds: [],
      createdAt: now,
      email: OWNER_EMAIL,
      fullName: 'Иванов Алексей Петрович',
      id: '00000000-0000-4000-b000-000000000001',
      passwordHash: '$2b$10$seed.owner.placeholder.hash.value.000000000000',
      phone: '+79001000001',
      roleSet: [Role.OWNER],
      status: UserStatus.ACTIVE,
      updatedAt: null,
      version: 1,
    });

    for (let i = 0; i < 2; i++) {
      const number = String(i + 1);

      await factory.createOne({
        branchIds: [branchForIndex(i)],
        email: `manager${number}@studio.local`,
        passwordHash: '$2b$10$seed.manager.placeholder.hash.value.00000000',
        phone: `+7900200000${number}`,
        roleSet: [Role.MANAGER],
        status: UserStatus.ACTIVE,
      });
    }

    for (let i = 0; i < 5; i++) {
      const number = String(i + 1);

      await factory.createOne({
        branchIds: [branchForIndex(i)],
        email: `master${number}@studio.local`,
        phone: `+7900300000${number}`,
        roleSet: [Role.MASTER],
        status: UserStatus.ACTIVE,
      });
    }

    await em.flush();

    seederLog(LABEL, 'Inserted 1 owner + 2 managers + 5 masters');
  }
}
