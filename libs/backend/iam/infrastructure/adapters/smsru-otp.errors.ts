export class SmsruApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly statusText: string,
  ) {
    super(`SMS.ru API error ${statusCode.toString()}: ${statusText}`);
    this.name = 'SmsruApiError';
  }
}

export class SmsruDeliveryError extends Error {
  constructor(
    readonly phone: string,
    readonly statusCode: number,
    readonly statusText: string,
  ) {
    super(`SMS.ru delivery failed for ${phone}: ${statusCode.toString()} — ${statusText}`);
    this.name = 'SmsruDeliveryError';
  }
}
