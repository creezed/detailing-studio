import { registerAs } from '@nestjs/config';

export interface SmsConfig {
  readonly sender: string;
  readonly smsRuApiKey: string;
}

export const smsConfig = registerAs(
  'sms',
  (): SmsConfig => ({
    sender: process.env['SMS_SENDER'] ?? 'Detailing',
    smsRuApiKey: process.env['SMS_RU_API_KEY'] ?? '',
  }),
);
