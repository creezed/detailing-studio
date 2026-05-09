import type { PhoneNumber } from '@det/backend-shared-ddd';

import type { OtpPurpose } from './otp-purpose';
import type { OtpRequestId } from './otp-request-id';
import type { OtpRequest } from './otp-request.aggregate';

export interface IOtpRequestRepository {
  findById(id: OtpRequestId): Promise<OtpRequest | null>;
  findPendingByPhoneAndPurpose(phone: PhoneNumber, purpose: OtpPurpose): Promise<OtpRequest | null>;
  save(otpRequest: OtpRequest): Promise<void>;
}
