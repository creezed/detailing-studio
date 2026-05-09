import { DomainError } from '@det/backend-shared-ddd';

import type { OtpRequestId } from './otp-request-id';

export class OtpExpiredError extends DomainError {
  readonly code = 'OTP_EXPIRED';
  readonly httpStatus = 410;

  constructor(public readonly otpRequestId: OtpRequestId) {
    super(`OTP request ${otpRequestId} has expired`);
  }
}

export class OtpInvalidCodeError extends DomainError {
  readonly code = 'OTP_INVALID_CODE';
  readonly httpStatus = 422;

  constructor(public readonly otpRequestId: OtpRequestId) {
    super(`OTP request ${otpRequestId} code is invalid`);
  }
}

export class OtpAttemptsExceededError extends DomainError {
  readonly code = 'OTP_ATTEMPTS_EXCEEDED';
  readonly httpStatus = 429;

  constructor(public readonly otpRequestId: OtpRequestId) {
    super(`OTP request ${otpRequestId} attempts exceeded`);
  }
}
