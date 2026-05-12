import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ChannelSendResult, ISmsSender } from '../../sender-ports';

@Injectable()
export class SmsRuAdapter implements ISmsSender {
  private readonly apiKey: string;
  private readonly sender: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('SMS_RU_API_KEY');
    this.sender = config.get<string>('SMS_RU_SENDER', '');
    this.baseUrl = config.get<string>('SMS_RU_BASE_URL', 'https://sms.ru');
  }

  async send(phone: string, text: string): Promise<ChannelSendResult> {
    const params = new URLSearchParams({
      api_id: this.apiKey,
      to: phone,
      msg: text,
      json: '1',
    });

    if (this.sender) {
      params.set('from', this.sender);
    }

    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        const retryable = response.status >= 500 || response.status === 429;

        return { ok: false, error: `HTTP ${String(response.status)}`, retryable };
      }

      const data = (await response.json()) as SmsRuResponse;

      if (data.status_code !== 100) {
        return {
          ok: false,
          error: `SMS.ru error: status_code=${String(data.status_code)}`,
          retryable: isRetryableStatusCode(data.status_code),
        };
      }

      const smsEntries = Object.values(data.sms ?? {});
      const first: SmsRuSmsEntry | undefined = smsEntries[0];

      return {
        ok: true,
        providerId: first?.sms_id ?? `smsru-${String(Date.now())}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      return { ok: false, error: message, retryable: true };
    }
  }
}

interface SmsRuSmsEntry {
  readonly status: string;
  readonly status_code: number;
  readonly sms_id?: string;
}

interface SmsRuResponse {
  readonly status: string;
  readonly status_code: number;
  readonly sms?: Record<string, SmsRuSmsEntry>;
}

function isRetryableStatusCode(code: number): boolean {
  const nonRetryable = new Set([202, 203, 204]);

  return !nonRetryable.has(code);
}
