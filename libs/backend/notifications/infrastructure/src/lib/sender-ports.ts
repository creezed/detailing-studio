export interface SendResult {
  readonly ok: true;
  readonly providerId: string;
}

export interface SendError {
  readonly ok: false;
  readonly error: string;
  readonly retryable: boolean;
}

export type ChannelSendResult = SendResult | SendError;

export interface ISmsSender {
  send(phone: string, text: string): Promise<ChannelSendResult>;
}

export interface EmailPayload {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface IEmailSender {
  send(payload: EmailPayload): Promise<ChannelSendResult>;
}

export interface ITelegramSender {
  sendToChat(
    chatId: string,
    markdown: string,
    inlineKeyboard?: ReadonlyArray<
      ReadonlyArray<{ readonly text: string; readonly callback_data: string }>
    >,
  ): Promise<ChannelSendResult>;
}

export interface PushPayload {
  readonly title: string;
  readonly body: string;
  readonly url?: string;
}

export interface PushSubscriptionDto {
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
}

export interface IWebPushSender {
  send(subscription: PushSubscriptionDto, payload: PushPayload): Promise<ChannelSendResult>;
}
