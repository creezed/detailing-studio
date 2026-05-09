import { Seeder } from '@mikro-orm/seeder';

import { CatalogSeeder } from './catalog.seeder';
import { CrmSeeder } from './crm.seeder';
import { seederLog } from './helpers/seeder-logger';
import { IamSeeder } from './iam.seeder';

import type { EntityManager } from '@mikro-orm/core';

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    seederLog('DatabaseSeeder', '=== Starting database seed ===');

    await this.call(em, [IamSeeder, CatalogSeeder, CrmSeeder]);

    seederLog('DatabaseSeeder', '=== Seed complete ===');
  }
}
