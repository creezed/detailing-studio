import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

import type { ISmsOtpPort } from '@det/backend/iam/application';

import { SmsruApiError, SmsruDeliveryError } from './smsru-otp.errors';

import type { SmsruSendResponse } from './smsru-otp.types';

const SMSRU_SEND_URL = 'https://sms.ru/sms/send';
const SMSRU_TIMEOUT_MS = 10_000;

@Injectable()
export class SmsruOtpAdapter implements ISmsOtpPort {
  private readonly _logger: ReturnType<typeof pino> = pino({ name: 'SmsruOtpAdapter' });

  constructor(private readonly _config: ConfigService) {}

  async send(phone: string, code: string): Promise<void> {
    const apiKey = this._config.get<string>('sms.smsRuApiKey') ?? '';

    if (apiKey.length === 0) {
      throw new SmsruApiError(0, 'SMS_RU_API_KEY is not configured');
    }

    const sender = this._config.get<string>('sms.sender') ?? '';
    const testMode = this._config.get<boolean>('sms.testMode') ?? false;

    const params = new URLSearchParams({
      api_id: apiKey,
      json: '1',
      msg: code,
      to: phone,
    });

    if (sender.length > 0) {
      params.set('from', sender);
    }

    if (testMode) {
      params.set('test', '1');
    }

    const response = await fetch(SMSRU_SEND_URL, {
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
      signal: AbortSignal.timeout(SMSRU_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new SmsruApiError(
        response.status,
        `HTTP ${response.status.toString()} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as SmsruSendResponse;

    if (json.status !== 'OK') {
      throw new SmsruApiError(json.status_code, json.status_text);
    }

    const smsResult = json.sms[phone];

    if (!smsResult) {
      throw new SmsruApiError(0, `No result for phone ${phone} in SMS.ru response`);
    }

    if (smsResult.status !== 'OK') {
      throw new SmsruDeliveryError(phone, smsResult.status_code, smsResult.status_text);
    }

    this._logger.info(
      { balance: json.balance, phone, smsId: smsResult.sms_id },
      'SMS OTP sent successfully',
    );
  }
}
