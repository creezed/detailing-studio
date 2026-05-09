import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver, defineConfig } from '@mikro-orm/postgresql';
import { SeedManager } from '@mikro-orm/seeder';

import {
  CatalogMaterialNormSchema,
  CatalogServiceCategorySchema,
  CatalogServicePriceHistorySchema,
  CatalogServicePricingSchema,
  CatalogServiceSchema,
} from '@det/backend/catalog/infrastructure';
import {
  IamInvitationSchema,
  IamOtpRequestSchema,
  IamRefreshSessionSchema,
  IamUserSchema,
} from '@det/backend/iam/infrastructure';
import { OutboxEventSchema } from '@det/backend/shared/outbox';

import { databaseConfig } from './config/database.config';

export default defineConfig({
  clientUrl: databaseConfig().url,
  driver: PostgreSqlDriver,
  entities: [
    IamUserSchema,
    IamInvitationSchema,
    IamOtpRequestSchema,
    IamRefreshSessionSchema,
    CatalogServiceCategorySchema,
    CatalogServiceSchema,
    CatalogServicePricingSchema,
    CatalogMaterialNormSchema,
    CatalogServicePriceHistorySchema,
    OutboxEventSchema,
  ],
  extensions: [Migrator, SeedManager],
  migrations: {
    path: 'apps/backend/api/src/migrations',
    pathTs: 'apps/backend/api/src/migrations',
  },
  seeder: {
    defaultSeeder: 'DatabaseSeeder',
    path: 'apps/backend/api/src/seeders',
    pathTs: 'apps/backend/api/src/seeders',
  },
});
