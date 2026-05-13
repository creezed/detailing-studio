import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  readonly host: string;
  readonly port: number;
}

export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    host: process.env['REDIS_HOST'] ?? '127.0.0.1',
    port: Number(process.env['REDIS_PORT'] ?? 6379),
  }),
);
