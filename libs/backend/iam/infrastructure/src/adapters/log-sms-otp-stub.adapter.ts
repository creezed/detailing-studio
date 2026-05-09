import { Injectable } from '@nestjs/common';
import pino from 'pino';

import type { ISmsOtpPort } from '@det/backend-iam-application';

@Injectable()
export class LogSmsOtpStubAdapter implements ISmsOtpPort {
  private readonly _logger: ReturnType<typeof pino> = pino({ name: 'LogSmsOtpStub' });

  send(phone: string, code: string): Promise<void> {
    this._logger.warn(
      { code, phone },
      'DEV STUB — OTP code (SMS not sent, SMS_RU_API_KEY is empty)',
    );

    return Promise.resolve();
  }
}
