export const SMS_OTP = Symbol('SMS_OTP');

export interface ISmsOtpPort {
  send(phone: string, code: string): Promise<void>;
}
