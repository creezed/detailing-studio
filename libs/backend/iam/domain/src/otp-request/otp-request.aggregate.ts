import { AggregateRoot, DateTime, PhoneNumber } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';

import { OtpCodeHash } from './otp-code-hash.value-object';
import { OtpRequestId } from './otp-request-id';
import { OtpRequestStatus } from './otp-request-status';
import {
  OtpAttemptsExceededError,
  OtpExpiredError,
  OtpInvalidCodeError,
} from './otp-request.errors';
import { OtpRequestFailed, OtpRequestIssued, OtpRequestVerified } from './otp-request.events';

import type { OtpPurpose } from './otp-purpose';

const DEFAULT_OTP_TTL_MINUTES = 5;
const DEFAULT_OTP_ATTEMPTS = 5;

export interface RequestOtpProps {
  readonly phone: PhoneNumber;
  readonly purpose: OtpPurpose;
  readonly codeHash: OtpCodeHash;
  readonly rawCode: string;
  readonly expiresAt?: DateTime;
  readonly attemptsLeft?: number;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface OtpRequestSnapshot {
  readonly id: string;
  readonly phone: string;
  readonly purpose: OtpPurpose;
  readonly codeHash: string;
  readonly status: OtpRequestStatus;
  readonly attemptsLeft: number;
  readonly expiresAt: string;
  readonly issuedAt: string;
  readonly verifiedAt: string | null;
}

export class OtpRequest extends AggregateRoot<OtpRequestId> {
  private constructor(
    private readonly _id: OtpRequestId,
    private readonly _phone: PhoneNumber,
    private readonly _purpose: OtpPurpose,
    private readonly _codeHash: OtpCodeHash,
    private _status: OtpRequestStatus,
    private _attemptsLeft: number,
    private readonly _expiresAt: DateTime,
    private readonly _issuedAt: DateTime,
    private _verifiedAt: DateTime | null,
  ) {
    super();
  }

  override get id(): OtpRequestId {
    return this._id;
  }

  static request(props: RequestOtpProps): OtpRequest {
    const expiresAt =
      props.expiresAt ??
      DateTime.from(props.now.toDate().getTime() + DEFAULT_OTP_TTL_MINUTES * 60 * 1000);

    const otpRequest = new OtpRequest(
      OtpRequestId.generate(props.idGen),
      props.phone,
      props.purpose,
      props.codeHash,
      OtpRequestStatus.PENDING,
      props.attemptsLeft ?? DEFAULT_OTP_ATTEMPTS,
      expiresAt,
      props.now,
      null,
    );

    otpRequest.addEvent(
      new OtpRequestIssued(
        otpRequest.id,
        otpRequest._phone,
        otpRequest._purpose,
        props.rawCode,
        props.now,
      ),
    );

    return otpRequest;
  }

  static restore(
    snapshot: OtpRequestSnapshot,
    compare: (rawCode: string, codeHash: string) => boolean,
  ): OtpRequest {
    return new OtpRequest(
      OtpRequestId.from(snapshot.id),
      PhoneNumber.from(snapshot.phone),
      snapshot.purpose,
      OtpCodeHash.fromHash(snapshot.codeHash, compare),
      snapshot.status,
      snapshot.attemptsLeft,
      DateTime.from(snapshot.expiresAt),
      DateTime.from(snapshot.issuedAt),
      snapshot.verifiedAt === null ? null : DateTime.from(snapshot.verifiedAt),
    );
  }

  verify(rawCode: string, now: DateTime): void {
    if (this._status === OtpRequestStatus.VERIFIED) {
      return;
    }

    if (this._attemptsLeft <= 0) {
      throw new OtpAttemptsExceededError(this.id);
    }

    if (this.isExpired(now)) {
      throw new OtpExpiredError(this.id);
    }

    if (!this._codeHash.verify(rawCode)) {
      this._attemptsLeft -= 1;
      this._status = this._attemptsLeft === 0 ? OtpRequestStatus.FAILED : OtpRequestStatus.PENDING;
      this.addEvent(new OtpRequestFailed(this.id, this._attemptsLeft, now));

      if (this._attemptsLeft === 0) {
        throw new OtpAttemptsExceededError(this.id);
      }

      throw new OtpInvalidCodeError(this.id);
    }

    this._status = OtpRequestStatus.VERIFIED;
    this._verifiedAt = now;
    this.addEvent(new OtpRequestVerified(this.id, now));
  }

  isExpired(now: DateTime): boolean {
    return now.toDate().getTime() > this._expiresAt.toDate().getTime();
  }

  toSnapshot(): OtpRequestSnapshot {
    return {
      attemptsLeft: this._attemptsLeft,
      codeHash: this._codeHash.getValue(),
      expiresAt: this._expiresAt.iso(),
      id: this.id,
      issuedAt: this._issuedAt.iso(),
      phone: this._phone.toString(),
      purpose: this._purpose,
      status: this._status,
      verifiedAt: this._verifiedAt?.iso() ?? null,
    };
  }
}
