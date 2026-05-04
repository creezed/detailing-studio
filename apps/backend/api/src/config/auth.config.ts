import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  readonly jwtSecret: string;
  readonly jwtAccessTtl: string;
  readonly jwtRefreshTtl: string;
  readonly vapidPrivateKey: string;
  readonly vapidPublicKey: string;
}

export const authConfig = registerAs(
  'auth',
  (): AuthConfig => ({
    jwtAccessTtl: process.env['JWT_ACCESS_TTL'] ?? '15m',
    jwtRefreshTtl: process.env['JWT_REFRESH_TTL'] ?? '30d',
    jwtSecret: process.env['JWT_SECRET'] ?? '',
    vapidPrivateKey: process.env['VAPID_PRIVATE_KEY'] ?? '',
    vapidPublicKey: process.env['VAPID_PUBLIC_KEY'] ?? '',
  }),
);
