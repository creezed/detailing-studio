import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

import type { ChannelSendResult, EmailPayload, IEmailSender } from '../../sender-ports';
import type { Transporter } from 'nodemailer';

@Injectable()
export class SmtpAdapter implements IEmailSender {
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    this.transporter = createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: config.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASS'),
      },
    });
    this.fromAddress = config.getOrThrow<string>('SMTP_FROM');
  }

  async send(payload: EmailPayload): Promise<ChannelSendResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return { ok: true, providerId: String(info.messageId) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = isRetryableSmtpError(error);

      return { ok: false, error: message, retryable };
    }
  }
}

function isRetryableSmtpError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;

  const msg = error.message.toLowerCase();

  if (msg.includes('connection') || msg.includes('timeout') || msg.includes('econnrefused')) {
    return true;
  }

  const codeMatch = /\b([45]\d{2})\b/.exec(msg);

  if (codeMatch) {
    const code = Number(codeMatch[1]);

    return code >= 400 && code < 500 ? false : code >= 500;
  }

  return true;
}
