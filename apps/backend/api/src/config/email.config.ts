import { registerAs } from '@nestjs/config';

const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface EmailConfig {
  readonly host: string;
  readonly password: string;
  readonly port: number;
  readonly user: string;
}

export const emailConfig = registerAs(
  'email',
  (): EmailConfig => ({
    host: process.env['SMTP_HOST'] ?? '127.0.0.1',
    password: process.env['SMTP_PASSWORD'] ?? '',
    port: parsePort(process.env['SMTP_PORT'], 1025),
    user: process.env['SMTP_USER'] ?? '',
  }),
);
