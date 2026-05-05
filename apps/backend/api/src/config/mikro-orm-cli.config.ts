import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver, defineConfig } from '@mikro-orm/postgresql';

export default defineConfig({
  clientUrl:
    process.env['DATABASE_URL'] ?? 'postgres://detailing:placeholder@127.0.0.1:5432/detailing',
  discovery: {
    warnWhenNoEntities: false,
  },
  driver: PostgreSqlDriver,
  entities: [],
  extensions: [Migrator],
  migrations: {
    path: 'apps/backend/api/src/migrations',
    pathTs: 'apps/backend/api/src/migrations',
  },
});
