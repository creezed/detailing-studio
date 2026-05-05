import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  readonly url: string;
}

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    url: process.env['DATABASE_URL'] ?? 'postgres://detailing:placeholder@127.0.0.1:5432/detailing',
  }),
);
