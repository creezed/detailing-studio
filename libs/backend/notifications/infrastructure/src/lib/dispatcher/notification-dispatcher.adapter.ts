import { Inject, Injectable, Logger } from '@nestjs/common';

import { TEMPLATE_RENDERER } from '@det/backend-notifications-application';
import type {
  DispatchResult,
  INotificationDispatcherPort,
  ITemplateRenderer,
} from '@det/backend-notifications-application';
import type { NotificationSnapshot } from '@det/backend-notifications-domain';

import {
  EMAIL_SENDER,
  MJML_EMAIL_RENDERER,
  SMS_SENDER,
  TELEGRAM_SENDER,
  WEB_PUSH_SENDER,
} from '../tokens';

import type { MjmlEmailRenderer } from '../rendering/mjml-email-renderer.adapter';
import type { IEmailSender, ISmsSender, ITelegramSender, IWebPushSender } from '../sender-ports';

@Injectable()
export class NotificationDispatcherAdapter implements INotificationDispatcherPort {
  private readonly logger = new Logger(NotificationDispatcherAdapter.name);

  constructor(
    @Inject(TEMPLATE_RENDERER)
    private readonly renderer: ITemplateRenderer,
    @Inject(SMS_SENDER)
    private readonly smsSender: ISmsSender,
    @Inject(MJML_EMAIL_RENDERER)
    private readonly mjmlRenderer: MjmlEmailRenderer,
    @Inject(TELEGRAM_SENDER)
    private readonly telegramSender: ITelegramSender,
    @Inject(WEB_PUSH_SENDER)
    private readonly pushSender: IWebPushSender,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: IEmailSender,
  ) {}

  async dispatch(notification: NotificationSnapshot): Promise<DispatchResult> {
    try {
      switch (notification.channel) {
        case 'SMS':
          return await this.dispatchSms(notification);
        case 'EMAIL':
          return await this.dispatchEmail(notification);
        case 'TELEGRAM':
          return await this.dispatchTelegram(notification);
        case 'PUSH':
          return await this.dispatchPush(notification);
        default:
          return {
            ok: false,
            error: `Unknown channel: ${notification.channel}`,
            retryable: false,
          };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`Dispatch error for ${notification.id}: ${message}`);

      return { ok: false, error: message, retryable: true };
    }
  }

  private async dispatchSms(n: NotificationSnapshot): Promise<DispatchResult> {
    const phone = this.extractPhone(n);

    if (!phone) {
      return { ok: false, error: 'No phone recipient for SMS', retryable: false };
    }

    const text = await this.renderer.render(
      this.getTemplateBody(n, 'SMS'),
      n.payload as Parameters<ITemplateRenderer['render']>[1],
    );

    return this.smsSender.send(phone, text);
  }

  private async dispatchEmail(n: NotificationSnapshot): Promise<DispatchResult> {
    const email = this.extractEmail(n);

    if (!email) {
      return { ok: false, error: 'No email recipient', retryable: false };
    }

    const mjmlBody = this.getTemplateBody(n, 'EMAIL');
    const { html, text } = await this.mjmlRenderer.render(mjmlBody, n.payload);

    return this.emailSender.send({
      to: email,
      subject: n.templateCode,
      html,
      text,
    });
  }

  private async dispatchTelegram(n: NotificationSnapshot): Promise<DispatchResult> {
    const chatId = this.extractTelegramChat(n);

    if (!chatId) {
      return { ok: false, error: 'No telegram chat recipient', retryable: false };
    }

    const markdown = await this.renderer.render(
      this.getTemplateBody(n, 'TELEGRAM'),
      n.payload as Parameters<ITemplateRenderer['render']>[1],
    );

    return this.telegramSender.sendToChat(chatId, markdown);
  }

  private async dispatchPush(n: NotificationSnapshot): Promise<DispatchResult> {
    const renderedJson = await this.renderer.render(
      this.getTemplateBody(n, 'PUSH'),
      n.payload as Parameters<ITemplateRenderer['render']>[1],
    );

    try {
      JSON.parse(renderedJson) as { title: string; body: string; url?: string };
    } catch {
      return { ok: false, error: 'Invalid push template JSON', retryable: false };
    }

    // PUSH needs a subscription object; the push subscription lookup
    // is done in the application layer before dispatch.
    // TODO: N.6 — iterate over user's subscriptions and send to each via this.pushSender
    return { ok: false, error: 'Push subscription lookup not implemented yet', retryable: false };
  }

  private extractPhone(n: NotificationSnapshot): string | null {
    if (n.recipient.kind === 'phone') return n.recipient.phone;

    return null;
  }

  private extractEmail(n: NotificationSnapshot): string | null {
    if (n.recipient.kind === 'email') return n.recipient.email;

    return null;
  }

  private extractTelegramChat(n: NotificationSnapshot): string | null {
    if (n.recipient.kind === 'telegramChat') return n.recipient.chatId;

    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getTemplateBody(n: NotificationSnapshot, _channel: string): string {
    // In production, template body is stored in the NotificationTemplate aggregate
    // and loaded by the IssueNotification handler. The notification snapshot
    // doesn't carry the body — it's resolved at dispatch time from the template repo.
    // For now, we use a placeholder that will be wired in N.6.
    return `{{templateCode}}: notification ${n.id}`;
  }
}
