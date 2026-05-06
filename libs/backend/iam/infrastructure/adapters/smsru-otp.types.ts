interface SmsruSmsItemSuccess {
  readonly status: 'OK';
  readonly status_code: 100;
  readonly sms_id: string;
}

interface SmsruSmsItemError {
  readonly status: 'ERROR';
  readonly status_code: number;
  readonly status_text: string;
}

export type SmsruSmsItem = SmsruSmsItemSuccess | SmsruSmsItemError;

interface SmsruSendResponseOk {
  readonly status: 'OK';
  readonly status_code: 100;
  readonly sms: Readonly<Record<string, SmsruSmsItem>>;
  readonly balance: number;
}

interface SmsruSendResponseError {
  readonly status: 'ERROR';
  readonly status_code: number;
  readonly status_text: string;
}

export type SmsruSendResponse = SmsruSendResponseOk | SmsruSendResponseError;
