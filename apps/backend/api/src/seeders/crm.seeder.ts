import { Seeder } from '@mikro-orm/seeder';

import { Role } from '@det/backend-iam-domain';
import { IamUserSchema } from '@det/backend-iam-infrastructure';

import { BRANCH_IDS } from './data/catalog.data';
import { ClientFactory } from './factories/client.factory';
import { seederLog } from './helpers/seeder-logger';

import type { EntityManager } from '@mikro-orm/core';

const BATCH_SIZE = 500;
const CLIENT_COUNT = 1_000;
const LABEL = 'CRM Seeder';

function branchForIndex(index: number): string {
  return index % 2 === 0 ? BRANCH_IDS.MAIN : BRANCH_IDS.SOUTH;
}

export class CrmSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const existingClients = await em.count(IamUserSchema, {
      email: { $like: 'client%@demo.studio.local' },
      roleSet: [Role.CLIENT],
    });

    if (existingClients >= CLIENT_COUNT) {
      seederLog(LABEL, `${String(existingClients)} demo clients already exist — skipping`);

      return;
    }

    seederLog(LABEL, `Seeding ${String(CLIENT_COUNT)} demo client accounts...`);

    const factory = new ClientFactory(em);

    for (let offset = existingClients; offset < CLIENT_COUNT; offset += BATCH_SIZE) {
      const limit = Math.min(offset + BATCH_SIZE, CLIENT_COUNT);

      for (let index = offset + 1; index <= limit; index++) {
        const client = factory.makeEntity({
          branchIds: [branchForIndex(index)],
          index,
        });

        em.persist(client);
      }

      await em.flush();
      em.clear();

      seederLog(LABEL, `Inserted ${String(limit)} / ${String(CLIENT_COUNT)} clients`);
    }
  }
}
