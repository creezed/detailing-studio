import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver, defineConfig } from '@mikro-orm/postgresql';

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
    OutboxEventSchema,
  ],
  extensions: [Migrator],
  migrations: {
    path: 'apps/backend/api/src/migrations',
    pathTs: 'apps/backend/api/src/migrations',
  },
});
