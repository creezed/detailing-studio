import { DomainEvent } from '@det/backend/shared/ddd';
import type { DateTime, PhoneNumber } from '@det/backend/shared/ddd';

import type { OtpPurpose } from './otp-purpose';
import type { OtpRequestId } from './otp-request-id';

const OTP_REQUEST_AGGREGATE_TYPE = 'OtpRequest';

function otpRequestEventProps(otpRequestId: OtpRequestId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: otpRequestId,
    aggregateType: OTP_REQUEST_AGGREGATE_TYPE,
    eventId: `${eventType}:${otpRequestId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class OtpRequestIssued extends DomainEvent {
  readonly eventType = 'OtpRequestIssued';

  constructor(
    public readonly otpRequestId: OtpRequestId,
    public readonly phone: PhoneNumber,
    public readonly purpose: OtpPurpose,
    public readonly issuedAt: DateTime,
  ) {
    super(otpRequestEventProps(otpRequestId, 'OtpRequestIssued', issuedAt));
  }
}

export class OtpRequestVerified extends DomainEvent {
  readonly eventType = 'OtpRequestVerified';

  constructor(
    public readonly otpRequestId: OtpRequestId,
    public readonly verifiedAt: DateTime,
  ) {
    super(otpRequestEventProps(otpRequestId, 'OtpRequestVerified', verifiedAt));
  }
}

export class OtpRequestFailed extends DomainEvent {
  readonly eventType = 'OtpRequestFailed';

  constructor(
    public readonly otpRequestId: OtpRequestId,
    public readonly attemptsLeft: number,
    public readonly failedAt: DateTime,
  ) {
    super(otpRequestEventProps(otpRequestId, 'OtpRequestFailed', failedAt));
  }
}
