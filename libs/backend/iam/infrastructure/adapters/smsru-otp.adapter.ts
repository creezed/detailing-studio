import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

import type { ISmsOtpPort } from '@det/backend/iam/application';

export class NotImplementedYetError extends Error {
  constructor() {
    super('SMS.ru production adapter is not implemented yet');
    this.name = 'NotImplementedYetError';
  }
}

@Injectable()
export class SmsruOtpAdapter implements ISmsOtpPort {
  private readonly logger: ReturnType<typeof pino> = pino({ name: 'SmsruOtpAdapter' });

  constructor(private readonly config: ConfigService) {}

  send(phone: string, code: string): Promise<void> {
    const apiKey = this.config.get<string>('sms.smsRuApiKey') ?? '';

    if (apiKey.length > 0) {
      throw new NotImplementedYetError();
    }

    this.logger.info({ code, phone }, 'SMS OTP dev stub');

    return Promise.resolve();
  }
}
